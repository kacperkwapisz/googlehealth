export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
  /** Space-separated OAuth scopes granted with this token. */
  scope?: string;
  /** Token type, e.g. "Bearer". */
  tokenType?: string;
}

export interface TokenStore {
  get(): Promise<TokenSet | null>;
  set(tokens: TokenSet): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryTokenStore implements TokenStore {
  #tokens: TokenSet | null = null;

  constructor(initial?: TokenSet) {
    if (initial) this.#tokens = initial;
  }

  async get() {
    return this.#tokens;
  }

  async set(tokens: TokenSet) {
    this.#tokens = tokens;
  }

  async clear() {
    this.#tokens = null;
  }
}

export function isExpired(tokens: TokenSet, skewMs = 60_000): boolean {
  return Date.now() >= tokens.expiresAt - skewMs;
}
