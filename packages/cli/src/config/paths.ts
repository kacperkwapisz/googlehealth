import { homedir } from "node:os";
import { join } from "node:path";

/**
 * XDG-style config root. Honors `GHEALTH_CONFIG_DIR` then `XDG_CONFIG_HOME`
 * then falls back to `~/.config`. All credential and config files live here.
 */
export function configDir(): string {
  const override = process.env.GHEALTH_CONFIG_DIR;
  if (override && override.length > 0) return override;
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "googlehealth");
}

export function configFile(): string {
  return join(configDir(), "config.json");
}

export function credentialsFile(): string {
  return join(configDir(), "credentials.json");
}
