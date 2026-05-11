/**
 * Minimal CSV writer. Flattens nested objects with dot-paths so a data point's
 * `heartRate.bpm` ends up under column `heartRate.bpm`. Arrays are JSON-encoded
 * inline because nested arrays don't fit CSV cleanly.
 */
export function toCsv(rows: unknown[]): string {
  if (rows.length === 0) return "";
  const flattened = rows.map((row) => flatten(row));
  const columns = collectColumns(flattened);
  const header = columns.map(escapeCell).join(",");
  const body = flattened
    .map((row) => columns.map((c) => escapeCell(row[c] ?? "")).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (value === null || value === undefined) {
    if (prefix) out[prefix] = value ?? "";
    return out;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    out[prefix || "value"] = Array.isArray(value) ? JSON.stringify(value) : value;
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
    }
  }
  return out;
}

function collectColumns(rows: Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) set.add(k);
  }
  return Array.from(set);
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
