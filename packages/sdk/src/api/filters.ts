import type { DataTypeMeta } from "../types/data-types.ts";

export type TimeInput = string | Date;

/**
 * Compose a Google Health `filter=` expression bounding a data type by time.
 * Returns `undefined` when no bounds are provided. Time bounds form a
 * half-open interval `from <= t < to`, matching the Go reference and standard
 * range semantics (no double-counting boundary points).
 *
 * The field path defaults by record type:
 * - sample → `<type>.sample_time.physical_time`
 * - interval/session → `<type>.interval.civil_start_time`
 * - daily → `<type>.date`
 *
 * A type can override with `filterField` (used for sleep, whose Session entry
 * only filters on `interval.end_time`). Time format is inferred from the field
 * suffix:
 * - `.date` → `YYYY-MM-DD`
 * - `.civil_*` → civil datetime without timezone
 * - anything else → RFC 3339 Z-normalized timestamp
 */
export function buildTimeFilter(
  type: DataTypeMeta,
  opts: { from?: TimeInput; to?: TimeInput },
): string | undefined {
  if (opts.from === undefined && opts.to === undefined) return undefined;
  const path = timeFieldPath(type);
  const fmt = formatForField(path);
  const parts: string[] = [];
  if (opts.from !== undefined) {
    parts.push(`${path} >= "${formatTime(opts.from, fmt)}"`);
  }
  if (opts.to !== undefined) {
    parts.push(`${path} < "${formatTime(opts.to, fmt)}"`);
  }
  return parts.join(" AND ");
}

function timeFieldPath(type: DataTypeMeta): string {
  if (type.filterField) return type.filterField;
  if (type.record === "sample") return `${type.snakeName}.sample_time.physical_time`;
  if (type.record === "daily") return `${type.snakeName}.date`;
  return `${type.snakeName}.interval.civil_start_time`;
}

type TimeFormat = "iso" | "civil" | "date";

function formatForField(path: string): TimeFormat {
  if (path.endsWith(".date")) return "date";
  if (/\.civil_[a-z_]+$/.test(path)) return "civil";
  return "iso";
}

function formatTime(value: TimeInput, fmt: TimeFormat): string {
  const raw = value instanceof Date ? value.toISOString() : value;
  if (fmt === "date") {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1]! : raw;
  }
  if (fmt === "civil") {
    // CivilDateTime: full local datetime, no timezone, no fractional seconds.
    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnly) return `${dateOnly[1]}T00:00:00`;
    return raw.replace(/\.\d+/, "").replace(/(Z|[+-]\d{2}:\d{2})$/, "");
  }
  // RFC 3339 timestamp: expand date-only and add Z when timezone is missing.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(raw)) return `${raw}Z`;
  return raw;
}
