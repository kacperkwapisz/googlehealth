import { defineCommand } from "citty";
import { isExpired, VERSION as SDK_VERSION } from "googlehealth";
import { FileTokenStore } from "../config/file-token-store.ts";
import { configDir, configFile, credentialsFile } from "../config/paths.ts";
import { loadConfig } from "../config/store.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

export const doctorCmd = defineCommand({
  meta: {
    name: "doctor",
    description: "Diagnose the CLI's local state (config, credentials, env).",
  },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "doctor", flags: args }, async () => {
      const config = await loadConfig();
      const tokens = await new FileTokenStore().get();
      return {
        sdkVersion: SDK_VERSION,
        node: process.version,
        configDir: configDir(),
        configFile: configFile(),
        credentialsFile: credentialsFile(),
        config: {
          hasClientId: Boolean(config.clientId),
          hasClientSecret: Boolean(config.clientSecret),
          hasProject: Boolean(config.project),
          baseUrl: config.baseUrl ?? null,
        },
        env: {
          GHEALTH_ACCESS_TOKEN: Boolean(process.env.GHEALTH_ACCESS_TOKEN),
          GHEALTH_CLIENT_ID: Boolean(process.env.GHEALTH_CLIENT_ID),
          GHEALTH_CLIENT_SECRET: Boolean(process.env.GHEALTH_CLIENT_SECRET),
          GHEALTH_PROJECT: Boolean(process.env.GHEALTH_PROJECT),
        },
        credentials: tokens
          ? {
              present: true,
              expired: isExpired(tokens, 0),
              expiresAt: new Date(tokens.expiresAt).toISOString(),
              hasRefreshToken: Boolean(tokens.refreshToken),
              scope: tokens.scope ?? null,
            }
          : { present: false },
      };
    });
  },
});
