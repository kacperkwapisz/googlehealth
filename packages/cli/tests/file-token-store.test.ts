import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileTokenStore } from "../src/config/file-token-store.ts";

let scratch: string | null = null;

afterEach(async () => {
  if (scratch) await rm(scratch, { recursive: true, force: true });
  scratch = null;
});

async function freshStore() {
  scratch = await mkdtemp(join(tmpdir(), "ghealth-test-"));
  return new FileTokenStore(join(scratch, "credentials.json"));
}

describe("FileTokenStore", () => {
  test("returns null when no file exists", async () => {
    const store = await freshStore();
    expect(await store.get()).toBeNull();
  });

  test("roundtrips a TokenSet through disk", async () => {
    const store = await freshStore();
    const tokens = {
      accessToken: "AT",
      refreshToken: "RT",
      expiresAt: Date.now() + 60_000,
      scope: "s.a",
    };
    await store.set(tokens);
    const read = await store.get();
    expect(read).toEqual(tokens);
  });

  test("clear() removes the credentials file", async () => {
    const store = await freshStore();
    await store.set({ accessToken: "AT", expiresAt: 0 });
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  test("writes the credentials file with 0600 permissions", async () => {
    const store = await freshStore();
    const path = join(scratch!, "credentials.json");
    await store.set({ accessToken: "AT", expiresAt: 0 });
    const mode = (await stat(path)).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
