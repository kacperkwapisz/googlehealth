import { defineCommand } from "citty";
import { DATA_TYPES, getDataType, listDataTypes } from "googlehealth";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const list = defineCommand({
  meta: { name: "list", description: "List every Google Health data type the CLI knows about." },
  args: {
    ...commonOutputArgs,
    scope: { type: "string", description: "Filter by OAuth scope category." },
    record: {
      type: "string",
      description: "Filter by record type (sample|interval|daily|session).",
    },
  },
  run({ args }) {
    return run({ command: "types list", flags: args }, async () => {
      const all = listDataTypes();
      const filtered = all.filter((t) => {
        if (args.scope && t.scope !== args.scope) return false;
        if (args.record && t.record !== args.record) return false;
        return true;
      });
      return filtered;
    });
  },
});

const describe = defineCommand({
  meta: { name: "describe", description: "Show metadata for a single data type." },
  args: {
    name: {
      type: "positional",
      description: "Kebab-case data type name (e.g. heart-rate).",
      required: true,
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "types describe", flags: args }, async () => {
      const meta = getDataType(args.name);
      if (!meta) {
        const available = Object.keys(DATA_TYPES).join(", ");
        throw new Error(`Unknown data type "${args.name}". Available: ${available}`);
      }
      return meta;
    });
  },
});

export const typesCmd = defineCommand({
  meta: {
    name: "types",
    description: "Browse Google Health data types and their supported operations.",
  },
  subCommands: { list, describe },
});
