import type { DataTypeMeta } from "../types/data-types.ts";

export type TimeInput = string | Date;

/**
 * Compose a Google Health `filter=` expression bounding a data type by time.
 * Returns `undefined` when no bounds are provided.
 *
 * The field path differs by record type:
 * - sample → `<type>.sample_time.physical_time`
 * - interval/session → `<type>.interval.start_time`
 * - daily → `<type>.civil_start_time`
 *
 * Times are accepted as ISO strings or `Date` instances. Sample/interval/session
 * filters use UTC physical time; daily filters use civil-time strings (no Z).
 */
export function buildTimeFilter(
  type: DataTypeMeta,
  opts: { from?: TimeInput; to?: TimeInput },
): string | undefined {
  if (opts.from === undefined && opts.to === undefined) return undefined;
  const path = timeFieldPath(type);
  const isCivil = type.record === "daily";
  const parts: string[] = [];
  if (opts.from !== undefined) {
    parts.push(`${path} >= "${formatTime(opts.from, isCivil)}"`);
  }
  if (opts.to !== undefined) {
    parts.push(`${path} <= "${formatTime(opts.to, isCivil)}"`);
  }
  return parts.join(" AND ");
}

function timeFieldPath(type: DataTypeMeta): string {
  if (type.record === "sample") return `${type.snakeName}.sample_time.physical_time`;
  if (type.record === "daily") return `${type.snakeName}.civil_start_time`;
  return `${type.snakeName}.interval.start_time`;
}

function formatTime(value: TimeInput, civil: boolean): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  if (!civil) return iso;
  // Strip trailing "Z" and fractional seconds for civil-time comparisons.
  return iso.replace(/Z$/, "").replace(/\.\d+$/, "");
}
