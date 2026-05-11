import { describe, expect, test } from "bun:test";
import { GoogleHealth } from "../src/index.ts";

interface CapturedRequest {
  url: string;
  method: string;
  body: string | null;
}

function makeClient(handlers: (req: CapturedRequest) => Response | Promise<Response>) {
  const log: CapturedRequest[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const req: CapturedRequest = {
      url: String(input),
      method: init?.method ?? "GET",
      body: (init?.body as string | null | undefined) ?? null,
    };
    log.push(req);
    return handlers(req);
  };
  return {
    log,
    client: new GoogleHealth({
      auth: "token",
      fetch: fakeFetch,
      baseUrl: "https://example.test/v4",
    }),
  };
}

describe("dataPoints.list", () => {
  test("builds the URL, attaches the time filter, returns the envelope", async () => {
    const { log, client } = makeClient(
      () => new Response(JSON.stringify({ dataPoints: [{ name: "a" }], nextPageToken: "tok" })),
    );
    const result = await client.dataPoints.list("heart-rate", {
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-02T00:00:00Z",
      pageSize: 50,
    });
    expect(result.dataPoints.length).toBe(1);
    expect(result.nextPageToken).toBe("tok");
    expect(log[0]!.url).toContain("/users/me/dataTypes/heart-rate/dataPoints");
    expect(log[0]!.url).toContain("pageSize=50");
    expect(log[0]!.url).toContain("heart_rate.sample_time.physical_time");
  });

  test("rejects an unsupported operation with BAD_REQUEST", async () => {
    const { client } = makeClient(() => new Response("{}"));
    try {
      await client.dataPoints.list("total-calories");
      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("does not support");
    }
  });
});

describe("dataPoints.iterate", () => {
  test("yields data points across paginated responses", async () => {
    let calls = 0;
    const { client } = makeClient((req) => {
      calls++;
      const u = new URL(req.url);
      const token = u.searchParams.get("pageToken");
      if (!token)
        return new Response(JSON.stringify({ dataPoints: [{ id: 1 }], nextPageToken: "t1" }));
      if (token === "t1")
        return new Response(JSON.stringify({ dataPoints: [{ id: 2 }, { id: 3 }] }));
      return new Response("nope", { status: 500 });
    });
    const seen: number[] = [];
    for await (const d of client.dataPoints.iterate<unknown>("steps")) {
      seen.push((d as { id: number }).id);
    }
    expect(seen).toEqual([1, 2, 3]);
    expect(calls).toBe(2);
  });
});

describe("dataPoints.rollUp / dailyRollUp", () => {
  test("rollUp posts the range + windowSize body", async () => {
    let body = "";
    const { client } = makeClient((req) => {
      body = req.body ?? "";
      return new Response(JSON.stringify({ rollupDataPoints: [] }));
    });
    await client.dataPoints.rollUp("steps", {
      range: { startTime: "2026-05-01T00:00:00Z", endTime: "2026-05-02T00:00:00Z" },
      windowSize: "3600s",
    });
    expect(JSON.parse(body)).toEqual({
      range: { startTime: "2026-05-01T00:00:00Z", endTime: "2026-05-02T00:00:00Z" },
      windowSize: "3600s",
    });
  });

  test("dailyRollUp accepts a civil date range", async () => {
    let url = "";
    const { client } = makeClient((req) => {
      url = req.url;
      return new Response(JSON.stringify({ rollupDataPoints: [] }));
    });
    await client.dataPoints.dailyRollUp("steps", {
      range: {
        start: { date: { year: 2026, month: 5, day: 1 } },
        end: { date: { year: 2026, month: 5, day: 7 } },
      },
      windowSizeDays: 1,
    });
    expect(url).toContain(":dailyRollUp");
  });
});
