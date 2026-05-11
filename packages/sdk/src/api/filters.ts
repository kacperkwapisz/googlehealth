import type { DataTypeMeta } from "../types/data-types.ts";

export type TimeInput = string | Date;

/**
 * Compose a Google Health `filter=` expression bounding a data type by time.
 * Returns `undefined` when no bounds are provided. Time bounds form a
 * half-open interval `from <= t < to`, matching the Go reference and standard
 * range semantics (no double-counting boundary points).
 *
 * The field path differs by record type:
 * - sample → `<type>.sample_time.physical_time`
 * - interval/session → `<type>.interval.civil_start_time`
 * - daily → `<type>.date`
 *
 * Times are accepted as ISO strings or `Date` instances. Daily filters take
 * `YYYY-MM-DD` style civil dates (Z and fractional seconds are stripped).
 */
export function buildTimeFilter(
  type: DataTypeMeta,
  opts: { from?: TimeInput; to?: TimeInput },
): string | undefined {
  if (opts.from === undefined && opts.to === undefined) return undefined;
  const path = timeFieldPath(type);
  const isDate = type.record === "daily";
  const parts: string[] = [];
  if (opts.from !== undefined) {
    parts.push(`${path} >= "${formatTime(opts.from, isDate)}"`);
  }
  if (opts.to !== undefined) {
    parts.push(`${path} < "${formatTime(opts.to, isDate)}"`);
  }
  return parts.join(" AND ");
}

function timeFieldPath(type: DataTypeMeta): string {
  if (type.record === "sample") return `${type.snakeName}.sample_time.physical_time`;
  if (type.record === "daily") return `${type.snakeName}.date`;
  return `${type.snakeName}.interval.civil_start_time`;
}

function formatTime(value: TimeInput, dateOnly: boolean): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  if (!dateOnly) return iso;
  // Daily filters compare against a civil date; strip time + zone.
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1]! : iso;
}
