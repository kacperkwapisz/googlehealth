import { describe, expect, test } from "bun:test";
import { generatePkce, randomState } from "../src/auth/pkce.ts";

describe("generatePkce", () => {
  test("produces RFC 7636 compliant verifier + S256 challenge", async () => {
    const pkce = await generatePkce();
    expect(pkce.codeChallengeMethod).toBe("S256");
    expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pkce.codeChallenge).not.toContain("=");
    expect(pkce.codeChallenge).not.toContain("+");
    expect(pkce.codeChallenge).not.toContain("/");
  });

  test("produces a unique verifier each call", async () => {
    const a = await generatePkce();
    const b = await generatePkce();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  test("challenge matches the SHA-256 of the verifier", async () => {
    const pkce = await generatePkce();
    const expected = await sha256Base64Url(pkce.codeVerifier);
    expect(pkce.codeChallenge).toBe(expected);
  });
});

describe("randomState", () => {
  test("returns URL-safe random strings of meaningful length", () => {
    const s = randomState();
    expect(s.length).toBeGreaterThanOrEqual(16);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomState()).not.toBe(s);
  });
});

async function sha256Base64Url(value: string): Promise<string> {
  const hashed = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const bytes = new Uint8Array(hashed);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
