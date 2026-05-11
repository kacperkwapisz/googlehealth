/**
 * Stable exit-code contract. Documented in `ghealth agent manifest` so shell
 * agents can branch on the numeric outcome without parsing strings.
 */
export const ExitCode = {
  Ok: 0,
  UserError: 1,
  Auth: 2,
  ApiClient: 3, // 4xx from Google
  ApiServer: 4, // 5xx from Google
  Network: 5,
  Usage: 64,
} as const;
export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

import type { ErrorCode } from "googlehealth";

export function codeForError(code: ErrorCode | undefined): ExitCode {
  switch (code) {
    case "AUTH":
      return ExitCode.Auth;
    case "RATE_LIMIT":
    case "BAD_REQUEST":
    case "NOT_FOUND":
    case "FORBIDDEN":
      return ExitCode.ApiClient;
    case "SERVER":
      return ExitCode.ApiServer;
    case "NETWORK":
    case "ABORTED":
      return ExitCode.Network;
    default:
      return ExitCode.UserError;
  }
}
