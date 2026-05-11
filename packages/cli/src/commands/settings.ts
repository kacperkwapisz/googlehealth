import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const get = defineCommand({
  meta: { name: "get", description: "Show the authenticated user's settings." },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "settings get", flags: args }, async () => {
      const { client } = await buildClient();
      return client.settings.get();
    });
  },
});

export const settingsCmd = defineCommand({
  meta: { name: "settings", description: "User settings (`/users/me/settings`)." },
  subCommands: { get },
});
