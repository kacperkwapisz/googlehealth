import { writeFile } from "node:fs/promises";
import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

const exportCmd = defineCommand({
  meta: { name: "export", description: "Export an exercise data point as TCX XML." },
  args: {
    name: {
      type: "positional",
      description: '"users/me/dataTypes/exercise/dataPoints/<id>".',
      required: true,
    },
    out: { type: "string", description: "Write XML to this file path instead of stdout." },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: "tcx export", flags: args }, async () => {
      const { client } = await buildClient();
      const xml = await client.tcx.export(args.name);
      if (args.out) {
        await writeFile(args.out, xml);
        return { written: args.out, bytes: xml.length };
      }
      process.stdout.write(xml);
      return { name: args.name, bytes: xml.length };
    });
  },
});

export const tcxCmd = defineCommand({
  meta: { name: "tcx", description: "TCX export." },
  subCommands: { export: exportCmd },
});
