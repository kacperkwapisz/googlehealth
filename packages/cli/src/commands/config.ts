import { defineCommand } from "citty";
import { type CliConfig, loadConfig, setConfigValue } from "../config/store.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const KEYS: Record<string, keyof CliConfig> = {
  "client-id": "clientId",
  "client-secret": "clientSecret",
  project: "project",
  "base-url": "baseUrl",
};

function resolveKey(input: string): keyof CliConfig {
  const k = KEYS[input];
  if (!k) throw new Error(`Unknown config key "${input}". Valid: ${Object.keys(KEYS).join(", ")}.`);
  return k;
}

const get = defineCommand({
  meta: { name: "get", description: "Show one config value (or all when omitted)." },
  args: {
    key: { type: "positional", description: "Config key (omit to list all).", required: false },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "config get", flags: args }, async () => {
      const config = await loadConfig();
      if (!args.key) return config;
      return { [args.key]: config[resolveKey(args.key)] ?? null };
    });
  },
});

const set = defineCommand({
  meta: { name: "set", description: "Set a config value." },
  args: {
    key: { type: "positional", description: "Config key.", required: true },
    value: { type: "positional", description: "Config value.", required: true },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "config set", flags: args }, async () => {
      const key = resolveKey(args.key);
      await setConfigValue(key, args.value);
      return { set: args.key };
    });
  },
});

const unset = defineCommand({
  meta: { name: "unset", description: "Remove a config value." },
  args: {
    key: { type: "positional", description: "Config key.", required: true },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "config unset", flags: args }, async () => {
      const key = resolveKey(args.key);
      await setConfigValue(key, undefined);
      return { unset: args.key };
    });
  },
});

export const configCmd = defineCommand({
  meta: { name: "config", description: "Manage CLI configuration (client_id, project, base URL)." },
  subCommands: { get, set, unset },
});
