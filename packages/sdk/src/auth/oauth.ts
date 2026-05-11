import { AuthError } from "../errors.ts";
import { RefreshingTokenAuth } from "./provider.ts";
import type { TokenSet, TokenStore } from "./tokens.ts";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface AuthorizationUrlOptions {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod?: "S256";
  /** `offline` returns a refresh token. Default `offline`. */
  accessType?: "offline" | "online";
  /** Force the consent screen. Default `consent` (needed to get a refresh token reliably). */
  prompt?: "none" | "consent" | "select_account";
  loginHint?: string;
  /** Extra params to pass through to the authorization endpoint. */
  extra?: Record<string, string>;
}

/** Build a Google OAuth 2.0 authorization URL with PKCE. */
export function buildAuthorizationUrl(opts: AuthorizationUrlOptions): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scopes.join(" "),
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: opts.codeChallengeMethod ?? "S256",
    access_type: opts.accessType ?? "offline",
    prompt: opts.prompt ?? "consent",
    include_granted_scopes: "true",
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) params.set(k, v);
  }
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface ExchangeCodeOptions {
  clientId: string;
  /** Optional for "public" / installed-app PKCE clients. */
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  fetch?: typeof fetch;
}

/** Exchange an authorization code for a TokenSet. */
export async function exchangeCode(opts: ExchangeCodeOptions): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    code_verifier: opts.codeVerifier,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret);
  return postToken(opts.fetch ?? globalThis.fetch, body);
}

export interface RefreshTokenOptions {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  fetch?: typeof fetch;
}

/**
 * Compose a RefreshingTokenAuth that uses the Google token endpoint behind the
 * scenes. Plug this into `GoogleHealth({ auth })` once a TokenSet is stored.
 */
export function createOAuthProvider(opts: {
  clientId: string;
  clientSecret?: string;
  store: TokenStore;
  fetch?: typeof fetch;
}): RefreshingTokenAuth {
  return new RefreshingTokenAuth(opts.store, (current) => {
    if (!current.refreshToken) {
      throw new AuthError({
        message: "Refresh token missing from stored credentials.",
        hint: "Re-authenticate to obtain a refresh token.",
      });
    }
    return refreshTokens({
      clientId: opts.clientId,
      ...(opts.clientSecret !== undefined ? { clientSecret: opts.clientSecret } : {}),
      refreshToken: current.refreshToken,
      ...(opts.fetch !== undefined ? { fetch: opts.fetch } : {}),
    });
  });
}

/** Exchange a refresh token for a fresh TokenSet. */
export async function refreshTokens(opts: RefreshTokenOptions): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret);
  const tokens = await postToken(opts.fetch ?? globalThis.fetch, body);
  // Google may not return a new refresh token on refresh; preserve the old one.
  if (!tokens.refreshToken) tokens.refreshToken = opts.refreshToken;
  return tokens;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface GoogleErrorResponse {
  error?: string;
  error_description?: string;
}

function causeChain(err: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    messages.push(`${current.name}: ${current.message}`);
    current = (current as { cause?: unknown }).cause;
  }
  return messages;
}

async function postToken(fetchImpl: typeof fetch, body: URLSearchParams): Promise<TokenSet> {
  let response: Response;
  try {
    response = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new AuthError({
      message: `Network error contacting Google OAuth token endpoint: ${detail}`,
      cause: err,
      retryable: true,
      details: causeChain(err),
    });
  }

  const raw = await response.text();
  let parsed: Partial<GoogleTokenResponse> & GoogleErrorResponse;
  try {
    parsed = raw ? (JSON.parse(raw) as Partial<GoogleTokenResponse> & GoogleErrorResponse) : {};
  } catch {
    throw new AuthError({
      message: `Google OAuth returned non-JSON body (HTTP ${response.status}).`,
      details: raw,
    });
  }

  if (!response.ok) {
    throw new AuthError({
      status: response.status,
      message:
        parsed.error_description ??
        parsed.error ??
        `Token request failed (HTTP ${response.status}).`,
      hint:
        parsed.error === "invalid_grant"
          ? "Refresh token revoked or expired. Re-authenticate."
          : "Check OAuth client configuration and granted scopes.",
      details: parsed,
    });
  }

  if (!parsed.access_token || typeof parsed.expires_in !== "number") {
    throw new AuthError({
      message: "Google OAuth response missing access_token or expires_in.",
      details: parsed,
    });
  }

  const tokens: TokenSet = {
    accessToken: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  };
  if (parsed.refresh_token) tokens.refreshToken = parsed.refresh_token;
  if (parsed.scope) tokens.scope = parsed.scope;
  if (parsed.token_type) tokens.tokenType = parsed.token_type;
  return tokens;
}
