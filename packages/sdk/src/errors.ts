export type ErrorCode =
  | "AUTH"
  | "RATE_LIMIT"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "SERVER"
  | "NETWORK"
  | "ABORTED"
  | "UNKNOWN";

export interface GoogleHealthErrorInit {
  code: ErrorCode;
  message: string;
  status?: number;
  retryable?: boolean;
  hint?: string;
  cause?: unknown;
  details?: unknown;
}

export class GoogleHealthError extends Error {
  readonly code: ErrorCode;
  readonly status: number | undefined;
  readonly retryable: boolean;
  readonly hint: string | undefined;
  readonly details: unknown;

  constructor(init: GoogleHealthErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = "GoogleHealthError";
    this.code = init.code;
    this.status = init.status;
    this.retryable = init.retryable ?? false;
    this.hint = init.hint;
    this.details = init.details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      hint: this.hint,
    };
  }
}

export class AuthError extends GoogleHealthError {
  constructor(init: Omit<GoogleHealthErrorInit, "code">) {
    super({ ...init, code: "AUTH" });
    this.name = "AuthError";
  }
}

export class RateLimitError extends GoogleHealthError {
  readonly retryAfterMs: number | undefined;
  constructor(init: Omit<GoogleHealthErrorInit, "code"> & { retryAfterMs?: number }) {
    super({ ...init, code: "RATE_LIMIT", retryable: true });
    this.name = "RateLimitError";
    this.retryAfterMs = init.retryAfterMs;
  }
}

export class HttpError extends GoogleHealthError {
  constructor(init: GoogleHealthErrorInit & { status: number }) {
    super(init);
    this.name = "HttpError";
  }
}

export class NetworkError extends GoogleHealthError {
  constructor(init: Omit<GoogleHealthErrorInit, "code">) {
    super({ ...init, code: "NETWORK", retryable: true });
    this.name = "NetworkError";
  }
}

export function statusToCode(status: number): ErrorCode {
  if (status === 401) return "AUTH";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "SERVER";
  if (status >= 400) return "BAD_REQUEST";
  return "UNKNOWN";
}
