import { GoogleHealthError } from "googlehealth";
import { codeForError, type ExitCode } from "../exit-codes.ts";

/**
 * Every `--json` response wears the same envelope. jq paths never break:
 * success and error both have `ok` and consistent siblings.
 */
export interface OkEnvelope<T = unknown> {
  ok: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
    retryable: boolean;
    status?: number;
    details?: unknown;
  };
  meta: EnvelopeMeta;
}

export interface EnvelopeMeta {
  command: string;
  count?: number;
  nextPageToken?: string;
  dataType?: string;
  range?: { from?: string; to?: string };
}

export type Envelope<T = unknown> = OkEnvelope<T> | ErrorEnvelope;

export function ok<T>(data: T, meta: EnvelopeMeta): OkEnvelope<T> {
  return { ok: true, data, meta };
}

export function fail(
  err: unknown,
  meta: EnvelopeMeta,
): { envelope: ErrorEnvelope; exit: ExitCode } {
  if (err instanceof GoogleHealthError) {
    const error: ErrorEnvelope["error"] = {
      code: err.code,
      message: err.message,
      retryable: err.retryable,
    };
    if (err.hint !== undefined) error.hint = err.hint;
    if (err.status !== undefined) error.status = err.status;
    if (err.details !== undefined) error.details = err.details;
    return { envelope: { ok: false, error, meta }, exit: codeForError(err.code) };
  }
  if (err instanceof Error) {
    return {
      envelope: {
        ok: false,
        error: { code: "UNKNOWN", message: err.message, retryable: false },
        meta,
      },
      exit: 1,
    };
  }
  return {
    envelope: {
      ok: false,
      error: { code: "UNKNOWN", message: String(err), retryable: false },
      meta,
    },
    exit: 1,
  };
}
