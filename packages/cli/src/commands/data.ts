import { defineCommand } from "citty";
import { type DataTypeName, getDataType } from "googlehealth";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs, listArgs } from "./_common.ts";

function ensureType(name: string): DataTypeName {
  if (!getDataType(name)) {
    throw new Error(`Unknown data type "${name}". Run \`ghealth types list\` to see all options.`);
  }
  return name as DataTypeName;
}

function listOptionsFromArgs(args: Record<string, unknown>) {
  const opts: Record<string, unknown> = {};
  if (args.filter) opts.filter = args.filter;
  if (args.from) opts.from = args.from;
  if (args.to) opts.to = args.to;
  if (args["page-size"]) opts.pageSize = Number(args["page-size"]);
  if (args["page-token"]) opts.pageToken = args["page-token"];
  return opts;
}

const list = defineCommand({
  meta: {
    name: "list",
    description: "List data points for a type. Auto-paginates up to --limit (default 1000).",
  },
  args: {
    type: {
      type: "positional",
      description: "Data type (e.g. heart-rate, steps, sleep).",
      required: true,
    },
    ...listArgs,
  },
  run({ args }) {
    const type = ensureType(args.type);
    const limit = Number(args.limit ?? "1000");
    const range: { from?: string; to?: string } = {};
    if (args.from) range.from = args.from;
    if (args.to) range.to = args.to;
    return run(
      {
        command: `data list ${type}`,
        flags: args,
        meta: {
          dataType: type,
          ...(Object.keys(range).length > 0 ? { range } : {}),
        },
      },
      async () => {
        const { client } = await buildClient();
        const opts = listOptionsFromArgs(args);
        if (limit > 0 && !args["page-token"]) {
          const items: unknown[] = [];
          for await (const item of client.dataPoints.iterate(type, opts)) {
            items.push(item);
            if (items.length >= limit) break;
          }
          return { dataPoints: items };
        }
        return client.dataPoints.list(type, opts);
      },
    );
  },
});

const get = defineCommand({
  meta: { name: "get", description: "Fetch a single data point by full resource name." },
  args: {
    name: {
      type: "positional",
      description: 'e.g. "users/me/dataTypes/sleep/dataPoints/<id>".',
      required: true,
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "data get", flags: args }, async () => {
      const { client } = await buildClient();
      return client.dataPoints.get(args.name);
    });
  },
});

const reconcile = defineCommand({
  meta: { name: "reconcile", description: "Reconciled list across data sources for a type." },
  args: {
    type: { type: "positional", description: "Data type.", required: true },
    "data-source-family": {
      type: "string",
      description: "Restrict to a specific data-source family.",
    },
    ...listArgs,
  },
  run({ args }) {
    const type = ensureType(args.type);
    return run(
      { command: `data reconcile ${type}`, flags: args, meta: { dataType: type } },
      async () => {
        const { client } = await buildClient();
        const opts = listOptionsFromArgs(args);
        if (args["data-source-family"]) opts.dataSourceFamily = args["data-source-family"];
        return client.dataPoints.reconcile(type, opts);
      },
    );
  },
});

const del = defineCommand({
  meta: { name: "delete", description: "Batch delete data points by full resource names." },
  args: {
    type: { type: "positional", description: "Data type.", required: true },
    names: { type: "string", description: "Comma-separated full resource names.", required: true },
    ...commonOutputArgs,
  },
  run({ args }) {
    const type = ensureType(args.type);
    const names = args.names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return run({ command: `data delete ${type}`, flags: args }, async () => {
      const { client } = await buildClient();
      await client.dataPoints.batchDelete(type, names);
      return { deleted: names.length };
    });
  },
});

export const dataCmd = defineCommand({
  meta: { name: "data", description: "Read and modify data points." },
  subCommands: { list, get, reconcile, delete: del },
});
