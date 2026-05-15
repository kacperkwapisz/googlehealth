import { describe, expect, test } from "bun:test";
import { AuthError, GoogleHealthError, RateLimitError } from "googlehealth";
import { ExitCode } from "../src/exit-codes.ts";
import { fail, ok } from "../src/output/envelope.ts";

const meta = { command: "x" };

describe("envelope.ok", () => {
  test("returns a typed OkEnvelope", () => {
    const env = ok({ hello: 1 }, meta);
    expect(env.ok).toBe(true);
    expect(env.data).toEqual({ hello: 1 });
    expect(env.meta.command).toBe("x");
  });
});

describe("envelope.fail", () => {
  test("AuthError → exit code Auth", () => {
    const { envelope, exit } = fail(new AuthError({ message: "nope" }), meta);
    expect(envelope.ok).toBe(false);
    if (envelope.ok === false) {
      expect(envelope.error.code).toBe("AUTH");
      expect(envelope.error.retryable).toBe(false);
    }
    expect(exit).toBe(ExitCode.Auth);
  });

  test("RateLimitError → exit code ApiClient and retryable=true", () => {
    const { envelope, exit } = fail(new RateLimitError({ message: "slow" }), meta);
    if (envelope.ok === false) {
      expect(envelope.error.code).toBe("RATE_LIMIT");
      expect(envelope.error.retryable).toBe(true);
    }
    expect(exit).toBe(ExitCode.ApiClient);
  });

  test("Server error → exit code ApiServer", () => {
    const err = new GoogleHealthError({
      code: "SERVER",
      message: "boom",
      status: 503,
      retryable: true,
    });
    const { exit } = fail(err, meta);
    expect(exit).toBe(ExitCode.ApiServer);
  });

  test("Plain Error → exit 1 and UNKNOWN code", () => {
    const { envelope, exit } = fail(new Error("plain"), meta);
    if (envelope.ok === false) {
      expect(envelope.error.code).toBe("UNKNOWN");
      expect(envelope.error.message).toBe("plain");
    }
    expect(exit).toBe(ExitCode.UserError);
  });
});
