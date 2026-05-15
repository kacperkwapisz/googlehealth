import { describe, expect, test } from "bun:test";
import { toCsv } from "../src/output/csv.ts";
import { pickFormat, renderError, renderOk } from "../src/output/format.ts";

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
    meta: { command: "x" },
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
      meta: { command: "x" },
    };
    expect(renderOk(env, "ndjson").trim()).toBe('{"id":1}');
  });
});

describe("renderError (human formats)", () => {
  const meta = { command: "x" };

  test("minimal error renders one line", () => {
    const out = renderError(
      {
        ok: false,
        error: { code: "AUTH", message: "Unauthorized.", retryable: false },
        meta,
      },
      "table",
    );
    expect(out).toBe("Error [AUTH]: Unauthorized.\n");
  });

  test("adds Hint line when present, omits Retryable/HTTP/Cause noise", () => {
    const out = renderError(
      {
        ok: false,
        error: {
          code: "AUTH",
          message: "Unauthorized.",
          retryable: false,
          status: 401,
          hint: "Re-authenticate.",
        },
        meta,
      },
      "table",
    );
    expect(out).toBe("Error [AUTH]: Unauthorized.\nHint: Re-authenticate.\n");
  });

  test("surfaces a string details field as a Details line", () => {
    const out = renderError(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid filter.",
          retryable: false,
          details: "unknown field: foo",
        },
        meta,
      },
      "table",
    );
    expect(out).toContain("Details: unknown field: foo");
  });

  test("joins string-array details with semicolons", () => {
    const out = renderError(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid.",
          retryable: false,
          details: ["field a missing", "field b out of range"],
        },
        meta,
      },
      "table",
    );
    expect(out).toContain("Details: field a missing; field b out of range");
  });

  test("silently drops non-string details to avoid JSON noise in human output", () => {
    const out = renderError(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid.",
          retryable: false,
          details: { foo: 1 },
        },
        meta,
      },
      "table",
    );
    expect(out).toBe("Error [BAD_REQUEST]: Invalid.\n");
  });

  test("json format always emits the full envelope", () => {
    const out = renderError(
      {
        ok: false,
        error: { code: "AUTH", message: "Unauthorized.", retryable: false },
        meta,
      },
      "json",
    );
    expect(JSON.parse(out).ok).toBe(false);
  });
});
