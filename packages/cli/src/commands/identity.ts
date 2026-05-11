import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const get = defineCommand({
  meta: { name: "get", description: "Show authenticated user identity (legacy + new Google IDs)." },
  args: commonOutputArgs,
  run({ args }) {
    return run({ command: "identity get", flags: args }, async () => {
      const { client } = await buildClient();
      return client.identity.get();
    });
  },
});

export const identityCmd = defineCommand({
  meta: { name: "identity", description: "User identity (`/users/me/identity`)." },
  subCommands: { get },
});
