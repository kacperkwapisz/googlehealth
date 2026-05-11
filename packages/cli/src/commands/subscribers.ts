import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const list = defineCommand({
  meta: { name: "list", description: "List webhook subscribers for a Google Cloud project." },
  args: {
    project: { type: "positional", description: "Google Cloud project ID.", required: true },
    "page-size": { type: "string", description: "Items per page." },
    "page-token": { type: "string", description: "Continuation token." },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "subscribers list", flags: args }, async () => {
      const { client } = await buildClient();
      const opts: Record<string, unknown> = {};
      if (args["page-size"]) opts.pageSize = Number(args["page-size"]);
      if (args["page-token"]) opts.pageToken = args["page-token"];
      return client.subscribers.list(args.project, opts);
    });
  },
});

const get = defineCommand({
  meta: { name: "get", description: "Fetch a single subscriber by resource name." },
  args: {
    name: {
      type: "positional",
      description: '"projects/<project>/subscribers/<id>".',
      required: true,
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "subscribers get", flags: args }, async () => {
      const { client } = await buildClient();
      return client.subscribers.get(args.name);
    });
  },
});

const del = defineCommand({
  meta: { name: "delete", description: "Delete a subscriber by resource name." },
  args: {
    name: {
      type: "positional",
      description: '"projects/<project>/subscribers/<id>".',
      required: true,
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "subscribers delete", flags: args }, async () => {
      const { client } = await buildClient();
      await client.subscribers.delete(args.name);
      return { deleted: args.name };
    });
  },
});

export const subscribersCmd = defineCommand({
  meta: { name: "subscribers", description: "Pub/Sub webhook subscriber management." },
  subCommands: { list, get, delete: del },
});
