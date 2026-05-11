import { defineCommand } from "citty";
import { DEFAULT_READ_SCOPES, DEFAULT_WRITE_SCOPES, isExpired } from "googlehealth";
import { runLoopbackFlow } from "../auth/loopback.ts";
import { FileTokenStore } from "../config/file-token-store.ts";
import { loadConfig } from "../config/store.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const login = defineCommand({
  meta: { name: "login", description: "Authorize via PKCE OAuth loopback flow." },
  args: {
    write: {
      type: "boolean",
      description: "Request write scopes in addition to read.",
      default: false,
    },
    scopes: { type: "string", description: "Comma-separated scope override." },
    port: { type: "string", description: "Preferred loopback port (default: any free port)." },
    "no-browser": {
      type: "boolean",
      description: "Don't open a browser; print the URL instead.",
      default: false,
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "auth login", flags: { ...args, quiet: true } }, async () => {
      const config = await loadConfig();
      if (!config.clientId) {
        throw new Error(
          "No OAuth client ID configured. Run `ghealth config set client-id <id>` (and `client-secret` if your client is type Web) or set GHEALTH_CLIENT_ID.",
        );
      }
      const scopes = args.scopes
        ? args.scopes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : args.write
          ? DEFAULT_WRITE_SCOPES
          : DEFAULT_READ_SCOPES;
      const tokens = await runLoopbackFlow({
        clientId: config.clientId,
        ...(config.clientSecret !== undefined ? { clientSecret: config.clientSecret } : {}),
        scopes,
        ...(args.port ? { port: Number(args.port) } : {}),
        openBrowser: !args["no-browser"],
        log: (line) => process.stderr.write(`${line}\n`),
      });
      await new FileTokenStore().set(tokens);
      return {
        loggedIn: true,
        scope: tokens.scope ?? scopes.join(" "),
        expiresAt: new Date(tokens.expiresAt).toISOString(),
      };
    });
  },
});

const logout = defineCommand({
  meta: { name: "logout", description: "Delete stored credentials." },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "auth logout", flags: args }, async () => {
      const store = new FileTokenStore();
      const before = await store.get();
      await store.clear();
      return { loggedOut: true, hadCredentials: Boolean(before) };
    });
  },
});

const status = defineCommand({
  meta: { name: "status", description: "Show whether credentials are present and valid." },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "auth status", flags: args }, async () => {
      const store = new FileTokenStore();
      const tokens = await store.get();
      if (!tokens) return { loggedIn: false };
      return {
        loggedIn: true,
        expired: isExpired(tokens, 0),
        expiresAt: new Date(tokens.expiresAt).toISOString(),
        scope: tokens.scope ?? null,
        hasRefreshToken: Boolean(tokens.refreshToken),
      };
    });
  },
});

export const authCmd = defineCommand({
  meta: { name: "auth", description: "Authenticate with Google Health." },
  subCommands: { login, logout, status },
});
