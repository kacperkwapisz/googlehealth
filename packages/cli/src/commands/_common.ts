/**
 * Shared citty arg definitions. Spread these into a command's `args` object
 * so every command speaks the same `--json` / `--format` / time-window flags.
 */
export const commonOutputArgs = {
  json: {
    type: "boolean" as const,
    description: "Force stable JSON envelope output (suitable for jq, AI agents).",
    default: false,
  },
  format: {
    type: "string" as const,
    description:
      "Output format: json|ndjson|csv|markdown|table. Default: table on TTY, json otherwise.",
  },
  quiet: {
    type: "boolean" as const,
    description: "Suppress the spinner shown during long-running operations.",
    default: false,
  },
} as const;

export const timeWindowArgs = {
  from: {
    type: "string" as const,
    description: "Inclusive lower bound (ISO 8601 timestamp).",
  },
  to: {
    type: "string" as const,
    description: "Inclusive upper bound (ISO 8601 timestamp).",
  },
} as const;

export const listArgs = {
  ...commonOutputArgs,
  ...timeWindowArgs,
  filter: {
    type: "string" as const,
    description: "Raw Google Health `filter=` expression (overrides --from/--to).",
  },
  "page-size": {
    type: "string" as const,
    description: "Items per API page (capped by Google).",
  },
  "page-token": {
    type: "string" as const,
    description: "Continue from a previous response's nextPageToken.",
  },
  limit: {
    type: "string" as const,
    description: "Auto-paginate up to N items (default: 1000). Set to 0 for unlimited.",
    default: "1000",
  },
} as const;
