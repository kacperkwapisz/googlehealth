import { AuthError } from "../errors.ts";
import { isExpired, type TokenSet, type TokenStore } from "./tokens.ts";

/**
 * Pluggable authentication. The SDK only needs a valid access token; how it's
 * obtained, refreshed, and stored is up to the consumer.
 *
 * - `StaticTokenAuth`: fixed bearer token, useful for tests and short scripts.
 * - `OAuthAuth` (ships in this package once OAuth lands): TokenStore-backed
 *   PKCE flow with automatic refresh.
 */
export interface AuthProvider {
  /** Return a usable access token. Refresh on demand if necessary. */
  getAccessToken(): Promise<string>;
  /** Mark the current token bad (called after an HTTP 401). */
  invalidate?(): Promise<void>;
}

export class StaticTokenAuth implements AuthProvider {
  constructor(private readonly token: string) {
    if (!token) {
      throw new AuthError({
        message: "StaticTokenAuth: empty access token",
        hint: "Pass a non-empty bearer token.",
      });
    }
  }

  async getAccessToken() {
    return this.token;
  }
}

/**
 * Refresh hook used by `RefreshingTokenAuth`. Implementations exchange the
 * stored refresh token for a new TokenSet (typically via the OAuth token
 * endpoint). The real implementation ships with the OAuth module; this seam
 * keeps the HTTP layer decoupled from any specific OAuth flow.
 */
export type RefreshFn = (current: TokenSet) => Promise<TokenSet>;

export class RefreshingTokenAuth implements AuthProvider {
  constructor(
    private readonly store: TokenStore,
    private readonly refresh: RefreshFn,
  ) {}

  async getAccessToken() {
    const tokens = await this.store.get();
    if (!tokens) {
      throw new AuthError({
        message: "No stored credentials.",
        hint: "Run `ghealth auth login` or seed the TokenStore manually.",
      });
    }
    if (!isExpired(tokens)) return tokens.accessToken;
    if (!tokens.refreshToken) {
      throw new AuthError({
        message: "Access token expired and no refresh token is available.",
        hint: "Run `ghealth auth login` to re-authenticate.",
      });
    }
    const next = await this.refresh(tokens);
    await this.store.set(next);
    return next.accessToken;
  }

  async invalidate() {
    const tokens = await this.store.get();
    if (!tokens) return;
    await this.store.set({ ...tokens, expiresAt: 0 });
  }
}
