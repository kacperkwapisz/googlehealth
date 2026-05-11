import { describe, expect, test } from "bun:test";
import { buildTimeFilter, DATA_TYPES } from "../src/index.ts";

describe("buildTimeFilter", () => {
  test("returns undefined when no bounds are provided", () => {
    expect(buildTimeFilter(DATA_TYPES["heart-rate"], {})).toBeUndefined();
  });

  test("sample types use sample_time.physical_time", () => {
    const f = buildTimeFilter(DATA_TYPES["heart-rate"], {
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-02T00:00:00Z",
    });
    expect(f).toBe(
      'heart_rate.sample_time.physical_time >= "2026-05-01T00:00:00Z" AND heart_rate.sample_time.physical_time <= "2026-05-02T00:00:00Z"',
    );
  });

  test("interval types use interval.start_time", () => {
    const f = buildTimeFilter(DATA_TYPES.steps, { from: "2026-05-01T00:00:00Z" });
    expect(f).toBe('steps.interval.start_time >= "2026-05-01T00:00:00Z"');
  });

  test("daily types use civil_start_time with civil timestamps", () => {
    const f = buildTimeFilter(DATA_TYPES["daily-resting-heart-rate"], {
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-02T00:00:00Z",
    });
    expect(f).toBe(
      'daily_resting_heart_rate.civil_start_time >= "2026-05-01T00:00:00" AND daily_resting_heart_rate.civil_start_time <= "2026-05-02T00:00:00"',
    );
  });

  test("session types share interval semantics", () => {
    const f = buildTimeFilter(DATA_TYPES.sleep, { from: new Date("2026-05-01T00:00:00Z") });
    expect(f).toContain("sleep.interval.start_time");
  });
});
