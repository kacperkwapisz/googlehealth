import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  AuthError,
  buildAuthorizationUrl,
  exchangeCode,
  generatePkce,
  randomState,
  type TokenSet,
} from "googlehealth";
import open from "open";

export interface LoopbackOptions {
  clientId: string;
  clientSecret?: string;
  scopes: readonly string[];
  /** Preferred loopback port. Defaults to 0 (any free port). */
  port?: number;
  /** Override host for the redirect URI. Default 127.0.0.1. */
  host?: string;
  /** Open the browser automatically. Default true. */
  openBrowser?: boolean;
  /** Optional message printer; gets called with status updates. */
  log?: (line: string) => void;
}

/**
 * Run the full PKCE loopback OAuth flow:
 * 1. Start a local HTTP server on a random port
 * 2. Open the Google consent screen in the user's browser
 * 3. Capture the `code` from the redirect, exchange for tokens
 * 4. Return the TokenSet and shut the server down
 */
export async function runLoopbackFlow(options: LoopbackOptions): Promise<TokenSet> {
  const host = options.host ?? "127.0.0.1";
  const log = options.log ?? (() => {});
  const pkce = await generatePkce();
  const state = randomState();
  const port = await openServer(host, options.port ?? 0);
  const redirectUri = `http://${host}:${port.port}/callback`;

  const authUrl = buildAuthorizationUrl({
    clientId: options.clientId,
    redirectUri,
    scopes: options.scopes,
    state,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: pkce.codeChallengeMethod,
  });

  log(`Open this URL to authorize:\n${authUrl}`);
  if (options.openBrowser !== false) {
    open(authUrl).catch(() => {
      log("(Could not launch your browser automatically; open the URL manually.)");
    });
  }

  const code = await port.waitForCode(state);
  return exchangeCode({
    clientId: options.clientId,
    ...(options.clientSecret !== undefined ? { clientSecret: options.clientSecret } : {}),
    code,
    redirectUri,
    codeVerifier: pkce.codeVerifier,
  });
}

interface OpenServer {
  port: number;
  waitForCode(state: string): Promise<string>;
}

async function openServer(host: string, preferredPort: number): Promise<OpenServer> {
  return new Promise((resolve, reject) => {
    let onResult: (err: Error | null, code?: string) => void = () => {};
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://${host}`);
      if (url.pathname !== "/callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      if (error) {
        respond(res, 400, `<h1>Authorization failed</h1><p>${escapeHtml(error)}</p>`);
        onResult(new AuthError({ message: `Authorization denied: ${error}` }));
        return;
      }
      if (!code) {
        respond(res, 400, "<h1>Missing ?code parameter.</h1>");
        onResult(new AuthError({ message: "Authorization callback missing `code`." }));
        return;
      }
      respond(
        res,
        200,
        "<h1>You're authorized.</h1><p>You can close this tab and return to the terminal.</p>",
      );
      onResult(null, code);
      void Promise.resolve().then(() => server.close());
      // Capture state for caller-side verification through closure.
      (server as unknown as { _capturedState?: string })._capturedState = state ?? "";
    });

    server.on("error", reject);
    server.listen(preferredPort, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to determine local server port."));
        return;
      }
      resolve({
        port: address.port,
        waitForCode(expectedState) {
          return new Promise<string>((res, rej) => {
            onResult = (err, code) => {
              if (err) return rej(err);
              const actual = (server as unknown as { _capturedState?: string })._capturedState;
              if (actual !== expectedState) {
                return rej(new AuthError({ message: "OAuth state mismatch — possible CSRF." }));
              }
              if (!code) return rej(new AuthError({ message: "Empty authorization code." }));
              res(code);
            };
          });
        },
      });
    });
  });
}

function respond(res: ServerResponse, status: number, html: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<!doctype html><html><body style="font:14px/1.4 -apple-system,system-ui,sans-serif;max-width:32em;margin:4em auto;color:#222">${html}</body></html>`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
