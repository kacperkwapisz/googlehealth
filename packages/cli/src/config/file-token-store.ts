import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { TokenSet, TokenStore } from "googlehealth";
import { credentialsFile } from "./paths.ts";

/**
 * File-backed `TokenStore` writing JSON to the XDG credentials path with
 * `0600` permissions. Used by the CLI. Apps embedding the SDK should
 * implement their own `TokenStore` (cookies, Redis, etc.).
 */
export class FileTokenStore implements TokenStore {
  constructor(private readonly path: string = credentialsFile()) {}

  async get(): Promise<TokenSet | null> {
    try {
      const raw = await readFile(this.path, "utf8");
      if (!raw.trim()) return null;
      return JSON.parse(raw) as TokenSet;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async set(tokens: TokenSet): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await writeFile(this.path, `${JSON.stringify(tokens, null, 2)}\n`, { mode: 0o600 });
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
