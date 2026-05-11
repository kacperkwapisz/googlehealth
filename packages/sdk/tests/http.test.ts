import { describe, expect, test } from "bun:test";
import {
  AuthError,
  HttpClient,
  HttpError,
  NetworkError,
  RateLimitError,
  StaticTokenAuth,
} from "../src/index.ts";

function makeClient(fakeFetch: typeof fetch) {
  return new HttpClient({
    auth: new StaticTokenAuth("static-token"),
    fetch: fakeFetch,
    baseUrl: "https://example.test/v4",
    retryBaseMs: 1,
  });
}

describe("HttpClient", () => {
  test("attaches bearer auth and parses JSON", async () => {
    let capturedHeaders: Headers | null = null;
    const fake: typeof fetch = async (_url, init) => {
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify({ name: "/users/me/identity" }));
    };
    const client = makeClient(fake);
    const result = await client.request<{ name: string }>("/users/me/identity");
    expect(result.name).toBe("/users/me/identity");
    expect(capturedHeaders!.get("authorization")).toBe("Bearer static-token");
  });

  test("retries 5xx then succeeds", async () => {
    let calls = 0;
    const fake: typeof fetch = async () => {
      calls++;
      if (calls < 3) return new Response("boom", { status: 503 });
      return new Response(JSON.stringify({ ok: true }));
    };
    const client = makeClient(fake);
    const result = await client.request<{ ok: boolean }>("/x");
    expect(result.ok).toBe(true);
    expect(calls).toBe(3);
  });

  test("throws RateLimitError on 429 with Retry-After", async () => {
    const fake: typeof fetch = async () =>
      new Response("slow down", { status: 429, headers: { "retry-after": "1" } });
    const client = makeClient(fake);
    try {
      await client.request("/x", { retries: 0 });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(1000);
    }
  });

  test("throws AuthError and invalidates on 401", async () => {
    let invalidated = false;
    const auth = {
      getAccessToken: async () => "t",
      invalidate: async () => {
        invalidated = true;
      },
    };
    const fake: typeof fetch = async () => new Response("nope", { status: 401 });
    const client = new HttpClient({ auth, fetch: fake, baseUrl: "https://x/v4", retryBaseMs: 1 });
    try {
      await client.request("/x");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
    }
    expect(invalidated).toBe(true);
  });

  test("throws HttpError on 4xx other than 401/429", async () => {
    const fake: typeof fetch = async () =>
      new Response(JSON.stringify({ error: "bad" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    const client = makeClient(fake);
    try {
      await client.request("/x");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(404);
      expect((err as HttpError).code).toBe("NOT_FOUND");
    }
  });

  test("wraps network errors", async () => {
    const fake: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const client = makeClient(fake);
    try {
      await client.request("/x", { retries: 0 });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NetworkError);
    }
  });

  test("paginate iterates across pageTokens", async () => {
    let calls = 0;
    const fake: typeof fetch = async (url) => {
      calls++;
      const u = new URL(String(url));
      const page = u.searchParams.get("pageToken");
      if (!page) return new Response(JSON.stringify({ dataPoints: [1, 2], nextPageToken: "p2" }));
      if (page === "p2")
        return new Response(JSON.stringify({ dataPoints: [3], nextPageToken: "p3" }));
      return new Response(JSON.stringify({ dataPoints: [4] }));
    };
    const client = makeClient(fake);
    const out: number[] = [];
    for await (const v of client.paginate<number>("/x", { itemsKey: "dataPoints" })) out.push(v);
    expect(out).toEqual([1, 2, 3, 4]);
    expect(calls).toBe(3);
  });

  test("respects responseType: 'text'", async () => {
    const fake: typeof fetch = async () =>
      new Response("<xml/>", { headers: { "content-type": "application/xml" } });
    const client = makeClient(fake);
    const result = await client.request<string>("/x", { responseType: "text" });
    expect(result).toBe("<xml/>");
  });
});
