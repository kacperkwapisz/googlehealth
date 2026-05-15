import { toCsv } from "./csv.ts";
import type { Envelope } from "./envelope.ts";

export type OutputFormat = "json" | "ndjson" | "csv" | "markdown" | "table";

export interface OutputOptions {
  format: OutputFormat;
  /** When format is the default (TTY-aware), this is `process.stdout.isTTY`. */
  isTty: boolean;
}

export function pickFormat(
  flag: string | undefined,
  jsonFlag: boolean,
  isTty: boolean,
): OutputFormat {
  if (jsonFlag) return "json";
  if (flag) return normalizeFormat(flag);
  return isTty ? "table" : "json";
}

function normalizeFormat(value: string): OutputFormat {
  const v = value.toLowerCase();
  if (v === "json" || v === "ndjson" || v === "csv" || v === "markdown" || v === "table") return v;
  throw new Error(`Unknown --format: ${value}. Use json|ndjson|csv|markdown|table.`);
}

/**
 * Render a successful envelope according to the chosen format. The error case
 * is handled separately; --json is always JSON-formatted regardless of TTY.
 */
export function renderOk<T>(envelope: Envelope<T>, fmt: OutputFormat): string {
  if (envelope.ok === false) return formatJson(envelope);
  switch (fmt) {
    case "json":
      return formatJson(envelope);
    case "ndjson":
      return formatNdjson(envelope.data);
    case "csv":
      return toCsv(asRowArray(envelope.data));
    case "markdown":
      return toMarkdownTable(asRowArray(envelope.data));
    case "table":
      return toAsciiTable(asRowArray(envelope.data));
  }
}

export function renderError(envelope: Envelope, fmt: OutputFormat): string {
  if (fmt === "json" || fmt === "ndjson") return formatJson(envelope);
  if (envelope.ok === true) return formatJson(envelope);
  const e = envelope.error;
  const lines = [
    `Error [${e.code}]: ${e.message}`,
    ...(e.hint ? [`Hint: ${e.hint}`] : []),
    ...renderDetails(e.details),
  ];
  return `${lines.join("\n")}\n`;
}

function renderDetails(details: unknown): string[] {
  if (details === undefined || details === null) return [];
  if (typeof details === "string") return [`Details: ${details}`];
  if (Array.isArray(details) && details.every((d) => typeof d === "string")) {
    if (details.length === 0) return [];
    if (details.length === 1) return [`Details: ${details[0]}`];
    return [`Details: ${details.join("; ")}`];
  }
  return [];
}

function formatJson(envelope: Envelope): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function formatNdjson(data: unknown): string {
  const rows = asRowArray(data);
  if (rows.length === 0) return "";
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function asRowArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["dataPoints", "rollupDataPoints", "subscribers", "items"]) {
      const v = (data as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v;
    }
    return [data];
  }
  return data === undefined ? [] : [data];
}

function toMarkdownTable(rows: unknown[]): string {
  if (rows.length === 0) return "_(no rows)_\n";
  const flat = rows.map(flattenForTable);
  const cols = collectKeys(flat);
  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = flat.map((r) => `| ${cols.map((c) => mdCell(r[c])).join(" | ")} |`).join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

function toAsciiTable(rows: unknown[]): string {
  if (rows.length === 0) return "(no rows)\n";
  const flat = rows.map(flattenForTable);
  const cols = collectKeys(flat);
  const term = Math.max(80, process.stdout.columns ?? 120);
  const widths = computeColumnWidths(cols, flat, term);
  const truncated = flat.map((r) =>
    cols.map((c, i) => truncate(String(r[c] ?? ""), widths[i] ?? 0)),
  );
  const fmtRow = (cells: string[]) =>
    `  ${cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ")}`;
  const header = fmtRow(cols.map((c, i) => truncate(c, widths[i] ?? 0)));
  const sep = fmtRow(widths.map((w) => "-".repeat(w)));
  const body = truncated.map(fmtRow).join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

/**
 * Pick per-column widths that fit the terminal. Two pass:
 * 1. Each column gets its natural width (max of header + content).
 * 2. If totals exceed terminal width, shrink the widest columns toward an
 *    even split until we fit. Minimum cell width is 6 chars.
 */
function computeColumnWidths(
  cols: string[],
  rows: Record<string, unknown>[],
  termWidth: number,
): number[] {
  const natural = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const padding = cols.length * 2 + 2;
  const budget = Math.max(40, termWidth - padding);
  let total = natural.reduce((a, b) => a + b, 0);
  if (total <= budget) return natural;
  const widths = [...natural];
  const minW = 6;
  while (total > budget) {
    let maxIdx = 0;
    for (let i = 1; i < widths.length; i++) {
      if ((widths[i] ?? 0) > (widths[maxIdx] ?? 0)) maxIdx = i;
    }
    if ((widths[maxIdx] ?? 0) <= minW) break;
    widths[maxIdx] = (widths[maxIdx] ?? 0) - 1;
    total -= 1;
  }
  return widths;
}

function truncate(value: string, max: number): string {
  if (max <= 0 || value.length <= max) return value;
  if (max <= 1) return value.slice(0, max);
  return `${value.slice(0, max - 1)}…`;
}

function flattenForTable(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return { value: value === undefined ? "" : value };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === "object") out[k] = JSON.stringify(v);
    else out[k] = v ?? "";
  }
  return out;
}

function collectKeys(rows: Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) set.add(k);
  return Array.from(set);
}

function mdCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
