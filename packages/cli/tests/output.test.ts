import { describe, expect, test } from "bun:test";
import { toCsv } from "../src/output/csv.ts";
import { pickFormat, renderOk } from "../src/output/format.ts";

describe("pickFormat", () => {
  test("prefers --json over --format and TTY default", () => {
    expect(pickFormat("table", true, true)).toBe("json");
  });
  test("uses --format when set", () => {
    expect(pickFormat("ndjson", false, true)).toBe("ndjson");
  });
  test("falls back to table on TTY, json on pipe", () => {
    expect(pickFormat(undefined, false, true)).toBe("table");
    expect(pickFormat(undefined, false, false)).toBe("json");
  });
  test("rejects unknown formats", () => {
    expect(() => pickFormat("xml", false, true)).toThrow();
  });
});

describe("toCsv", () => {
  test("flattens nested objects with dot-paths", () => {
    const csv = toCsv([
      { name: "a", heartRate: { bpm: 72 } },
      { name: "b", heartRate: { bpm: 80 } },
    ]);
    expect(csv).toContain("name");
    expect(csv).toContain("heartRate.bpm");
    expect(csv).toContain("72");
  });

  test("escapes quotes, commas, and newlines", () => {
    const csv = toCsv([{ note: 'has "quote", and\nnewline' }]);
    expect(csv).toContain('"has ""quote"", and\nnewline"');
  });

  test("returns empty string for empty input", () => {
    expect(toCsv([])).toBe("");
  });
});

describe("renderOk", () => {
  const envelope = {
    ok: true as const,
    data: [{ a: 1 }, { a: 2 }],
    meta: { command: "x", durationMs: 0 },
  };

  test("json wraps in the full envelope", () => {
    const out = renderOk(envelope, "json");
    expect(out).toContain('"ok": true');
    expect(out).toContain('"command": "x"');
  });

  test("ndjson emits one line per row, no envelope", () => {
    const out = renderOk(envelope, "ndjson");
    const lines = out.trim().split("\n");
    expect(lines).toEqual(['{"a":1}', '{"a":2}']);
  });

  test("table renders aligned columns", () => {
    const out = renderOk(envelope, "table");
    expect(out).toContain("a");
    expect(out).toContain("1");
  });

  test("auto-extracts dataPoints array for tabular formats", () => {
    const env = {
      ok: true as const,
      data: { dataPoints: [{ id: 1 }], nextPageToken: "tok" },
      meta: { command: "x", durationMs: 0 },
    };
    expect(renderOk(env, "ndjson").trim()).toBe('{"id":1}');
  });
});
