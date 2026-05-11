import { describe, expect, test } from "bun:test";
import { dataPointBaseSchema, dataPointListResponseSchema, intervalSchema } from "../src/index.ts";

describe("intervalSchema", () => {
  test("accepts a Google-shaped interval with passthrough fields", () => {
    const result = intervalSchema.parse({
      startTime: "2026-05-10T00:00:00Z",
      endTime: "2026-05-11T00:00:00Z",
      startUtcOffset: "+02:00",
      newGoogleField: 42,
    });
    expect(result.startTime).toBe("2026-05-10T00:00:00Z");
    expect((result as Record<string, unknown>).newGoogleField).toBe(42);
  });

  test("rejects missing required times", () => {
    expect(() => intervalSchema.parse({ startTime: "x" })).toThrow();
  });
});

describe("dataPointBaseSchema", () => {
  test("accepts a minimal data point", () => {
    const result = dataPointBaseSchema.parse({});
    expect(result).toEqual({});
  });

  test("preserves unknown payload fields via passthrough", () => {
    const parsed = dataPointBaseSchema.parse({
      name: "users/me/dataTypes/heart-rate/dataPoints/abc",
      heartRate: { bpm: 72 },
    });
    expect((parsed as Record<string, unknown>).heartRate).toEqual({ bpm: 72 });
  });
});

describe("dataPointListResponseSchema", () => {
  test("defaults dataPoints to an empty array", () => {
    const r = dataPointListResponseSchema.parse({});
    expect(r.dataPoints).toEqual([]);
  });

  test("preserves nextPageToken", () => {
    const r = dataPointListResponseSchema.parse({
      dataPoints: [{ name: "a" }],
      nextPageToken: "tok",
    });
    expect(r.nextPageToken).toBe("tok");
    expect(r.dataPoints.length).toBe(1);
  });
});
