import { describe, expect, test } from "bun:test";
import {
  AuthError,
  buildAuthorizationUrl,
  exchangeCode,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  refreshTokens,
} from "../src/index.ts";

describe("buildAuthorizationUrl", () => {
  test("includes every PKCE / scope / state parameter", () => {
    const url = buildAuthorizationUrl({
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:5555/callback",
      scopes: ["scope.a", "scope.b"],
      state: "STATE",
      codeChallenge: "CHAL",
    });
    expect(url.startsWith(GOOGLE_AUTH_URL)).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("client_id")).toBe("client-123");
    expect(params.get("redirect_uri")).toBe("http://127.0.0.1:5555/callback");
    expect(params.get("response_type")).toBe("code");
    expect(params.get("scope")).toBe("scope.a scope.b");
    expect(params.get("state")).toBe("STATE");
    expect(params.get("code_challenge")).toBe("CHAL");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("prompt")).toBe("consent");
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("exchangeCode", () => {
  test("posts form-encoded body and returns a TokenSet", async () => {
    let captured: { url: string; body: URLSearchParams } | null = null;
    const fakeFetch: typeof fetch = async (input, init) => {
      const body = new URLSearchParams((init?.body as string) ?? "");
      captured = { url: String(input), body };
      return jsonResponse({
        access_token: "AT",
        expires_in: 3600,
        refresh_token: "RT",
        scope: "scope.a",
        token_type: "Bearer",
      });
    };
    const tokens = await exchangeCode({
      clientId: "client-1",
      clientSecret: "secret",
      code: "code-1",
      redirectUri: "http://127.0.0.1/callback",
      codeVerifier: "verifier-1",
      fetch: fakeFetch,
    });
    expect(captured!.url).toBe(GOOGLE_TOKEN_URL);
    expect(captured!.body.get("grant_type")).toBe("authorization_code");
    expect(captured!.body.get("code")).toBe("code-1");
    expect(captured!.body.get("client_secret")).toBe("secret");
    expect(captured!.body.get("code_verifier")).toBe("verifier-1");
    expect(tokens.accessToken).toBe("AT");
    expect(tokens.refreshToken).toBe("RT");
    expect(tokens.tokenType).toBe("Bearer");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  test("throws AuthError on a Google error response", async () => {
    const fakeFetch: typeof fetch = async () =>
      jsonResponse({ error: "invalid_grant", error_description: "bad code" }, { status: 400 });
    try {
      await exchangeCode({
        clientId: "x",
        code: "y",
        redirectUri: "z",
        codeVerifier: "v",
        fetch: fakeFetch,
      });
      throw new Error("expected exchangeCode to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).message).toContain("bad code");
      expect((err as AuthError).status).toBe(400);
    }
  });
});

describe("refreshTokens", () => {
  test("preserves the prior refresh_token when Google omits it", async () => {
    const fakeFetch: typeof fetch = async () =>
      jsonResponse({ access_token: "AT2", expires_in: 3600, scope: "scope.a" });
    const tokens = await refreshTokens({
      clientId: "c",
      refreshToken: "OLD_REFRESH",
      fetch: fakeFetch,
    });
    expect(tokens.accessToken).toBe("AT2");
    expect(tokens.refreshToken).toBe("OLD_REFRESH");
  });
});
