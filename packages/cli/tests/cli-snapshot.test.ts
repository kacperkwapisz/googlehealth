import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "main.mjs");

async function runCli(args: string[]) {
  // Isolate every run from the user's real credentials/config.
  const scratch = await mkdtemp(join(tmpdir(), "ghealth-snapshot-"));
  const env = {
    ...process.env,
    GHEALTH_CONFIG_DIR: scratch,
    GHEALTH_ACCESS_TOKEN: "",
    GHEALTH_CLIENT_ID: "",
    GHEALTH_CLIENT_SECRET: "",
  };
  const proc = Bun.spawn(["node", CLI, ...args], { stdout: "pipe", stderr: "pipe", env });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  return { stdout, stderr, code: proc.exitCode ?? -1 };
}

describe("ghealth golden output", () => {
  test("types list --json envelope", async () => {
    const { stdout, code } = await runCli(["types", "list", "--json"]);
    expect(code).toBe(0);
    const env = JSON.parse(stdout);
    expect(env.ok).toBe(true);
    expect(Array.isArray(env.data)).toBe(true);
    expect(env.data.length).toBe(31);
    expect(env.meta.command).toBe("types list");
    expect(typeof env.meta.durationMs).toBe("number");
  });

  test("types describe heart-rate --json", async () => {
    const { stdout, code } = await runCli(["types", "describe", "heart-rate", "--json"]);
    expect(code).toBe(0);
    const env = JSON.parse(stdout);
    expect(env.ok).toBe(true);
    expect(env.data.name).toBe("heart-rate");
    expect(env.data.record).toBe("sample");
  });

  test("auth status --json with no credentials returns loggedIn=false", async () => {
    const { stdout, code } = await runCli(["auth", "status", "--json"]);
    expect(code).toBe(0);
    const env = JSON.parse(stdout);
    expect(env.ok).toBe(true);
    expect(env.data.loggedIn).toBe(false);
  });

  test("agent manifest --json includes exitCodes and all data types", async () => {
    const { stdout, code } = await runCli(["agent", "manifest"]);
    expect(code).toBe(0);
    const env = JSON.parse(stdout);
    expect(env.ok).toBe(true);
    expect(env.data.name).toBe("ghealth");
    expect(env.data.exitCodes["0"]).toBe("ok");
    expect(env.data.exitCodes["2"]).toBe("authentication-error");
    expect(env.data.dataTypes.length).toBe(31);
    expect(env.data.commands.types).toBeDefined();
    expect(env.data.commands.data.subCommands.list).toBeDefined();
  });

  test("data list with no credentials returns auth error envelope on stderr, exit 2", async () => {
    const { stderr, code } = await runCli(["data", "list", "heart-rate", "--json"]);
    expect(code).toBe(2);
    const env = JSON.parse(stderr);
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("AUTH");
    expect(env.error.retryable).toBe(false);
  });

  test("types describe garbage exits non-zero with stable error envelope", async () => {
    const { stderr, code } = await runCli(["types", "describe", "garbage", "--json"]);
    expect(code).not.toBe(0);
    const env = JSON.parse(stderr);
    expect(env.ok).toBe(false);
    expect(env.error.message).toContain("Unknown data type");
  });
});
