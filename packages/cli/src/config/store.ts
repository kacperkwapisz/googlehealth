import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { configFile } from "./paths.ts";

/**
 * CLI configuration (non-credentials). Stored at the XDG config path; users
 * can also override every key with a `GHEALTH_*` environment variable.
 */
export interface CliConfig {
  /** Google Cloud OAuth client ID. Required for `auth login`. */
  clientId?: string;
  /** Google Cloud OAuth client secret. Required for Desktop OAuth clients. */
  clientSecret?: string;
  /** Default Google Cloud project for subscriber commands. */
  project?: string;
  /** Default API base URL override. */
  baseUrl?: string;
}

const ENV_MAP: Record<keyof CliConfig, string> = {
  clientId: "GHEALTH_CLIENT_ID",
  clientSecret: "GHEALTH_CLIENT_SECRET",
  project: "GHEALTH_PROJECT",
  baseUrl: "GHEALTH_BASE_URL",
};

export async function loadConfig(): Promise<CliConfig> {
  const file = await readConfigFile();
  const merged: CliConfig = { ...file };
  for (const [key, envKey] of Object.entries(ENV_MAP) as [keyof CliConfig, string][]) {
    const value = process.env[envKey];
    if (value && value.length > 0) merged[key] = value;
  }
  return merged;
}

export async function setConfigValue<K extends keyof CliConfig>(
  key: K,
  value: CliConfig[K] | undefined,
): Promise<void> {
  const current = await readConfigFile();
  if (value === undefined) delete current[key];
  else current[key] = value;
  await writeConfigFile(current);
}

export async function readConfigFile(): Promise<CliConfig> {
  try {
    const raw = await readFile(configFile(), "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw) as CliConfig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeConfigFile(config: CliConfig): Promise<void> {
  const path = configFile();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}
