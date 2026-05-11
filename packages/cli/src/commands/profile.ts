import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const get = defineCommand({
  meta: { name: "get", description: "Show the authenticated user's profile." },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "profile get", flags: args }, async () => {
      const { client } = await buildClient();
      return client.profile.get();
    });
  },
});

export const profileCmd = defineCommand({
  meta: { name: "profile", description: "User profile (`/users/me/profile`)." },
  subCommands: { get },
});
