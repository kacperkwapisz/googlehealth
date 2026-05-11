import { describe, expect, test } from "bun:test";
import {
  DATA_TYPE_NAMES,
  DATA_TYPES,
  dataTypeNameSchema,
  getDataType,
  listDataTypes,
  scopeFor,
  supports,
} from "../src/index.ts";

describe("data type registry", () => {
  test("covers all 31 v4 data types", () => {
    expect(DATA_TYPE_NAMES.length).toBe(31);
    expect(listDataTypes().length).toBe(31);
  });

  test("every entry has matching name/snakeName/field shapes", () => {
    for (const meta of listDataTypes()) {
      expect(meta.snakeName).toBe(meta.name.replace(/-/g, "_"));
      expect(meta.field.charAt(0)).toBe(meta.field.charAt(0).toLowerCase());
      expect(meta.operations.length).toBeGreaterThan(0);
    }
  });

  test("getDataType returns metadata or undefined", () => {
    expect(getDataType("heart-rate")?.record).toBe("sample");
    expect(getDataType("not-a-type")).toBeUndefined();
  });

  test("supports() reflects registered operations", () => {
    expect(supports("heart-rate", "list")).toBe(true);
    expect(supports("heart-rate", "create")).toBe(false);
    expect(supports("weight", "batchDelete")).toBe(true);
  });

  test("scopeFor maps to the correct Google Health scope", () => {
    expect(scopeFor("heart-rate", false)).toBe(
      "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    );
    expect(scopeFor("steps", true)).toBe(
      "https://www.googleapis.com/auth/googlehealth.activity_and_fitness",
    );
    expect(scopeFor("sleep", false)).toBe(
      "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    );
    expect(scopeFor("hydration-log", true)).toBe(
      "https://www.googleapis.com/auth/googlehealth.nutrition",
    );
  });

  test("zod literal accepts only known names", () => {
    expect(dataTypeNameSchema.safeParse("heart-rate").success).toBe(true);
    expect(dataTypeNameSchema.safeParse("nonsense").success).toBe(false);
  });

  test("registry keys equal exported DATA_TYPE_NAMES", () => {
    expect(Object.keys(DATA_TYPES)).toEqual([...DATA_TYPE_NAMES]);
  });
});
