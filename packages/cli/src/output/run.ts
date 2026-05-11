import { fail, ok } from "./envelope.ts";
import { type OutputFormat, pickFormat, renderError, renderOk } from "./format.ts";

export interface GlobalFlags {
  json?: boolean;
  format?: string;
}

export interface RunContext {
  command: string;
  flags: GlobalFlags;
  meta?: {
    count?: number;
    nextPageToken?: string;
    dataType?: string;
    range?: { from?: string; to?: string };
  };
}

/**
 * Run a CLI handler with the stable envelope contract:
 * - success → renderOk in the chosen format, exit 0
 * - failure → renderError with stable JSON error envelope, exit with mapped code
 *
 * Format precedence: --json > --format > TTY-aware default (table on TTY, json on pipe).
 */
export async function run<T>(ctx: RunContext, handler: () => Promise<T>): Promise<never> {
  const isTty = Boolean(process.stdout.isTTY);
  const fmt: OutputFormat = pickFormat(ctx.flags.format, ctx.flags.json ?? false, isTty);
  const started = performance.now();
  try {
    const data = await handler();
    const envelope = ok(data, {
      command: ctx.command,
      durationMs: Math.round(performance.now() - started),
      ...(ctx.meta ?? {}),
    });
    process.stdout.write(renderOk(envelope, fmt));
    process.exit(0);
  } catch (err) {
    const { envelope, exit } = fail(err, {
      command: ctx.command,
      durationMs: Math.round(performance.now() - started),
      ...(ctx.meta ?? {}),
    });
    process.stderr.write(renderError(envelope, fmt));
    process.exit(exit);
  }
}
