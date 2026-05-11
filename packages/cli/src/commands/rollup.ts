import { defineCommand } from "citty";
import { type DataTypeName, getDataType } from "googlehealth";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

function ensureType(name: string): DataTypeName {
  if (!getDataType(name)) throw new Error(`Unknown data type "${name}".`);
  return name as DataTypeName;
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`Expected YYYY-MM-DD or ISO date; got "${value}".`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

const window = defineCommand({
  meta: { name: "window", description: "Roll up by fixed time window (seconds)." },
  args: {
    type: { type: "positional", description: "Data type.", required: true },
    from: { type: "string", description: "Start time (ISO 8601).", required: true },
    to: { type: "string", description: "End time (ISO 8601).", required: true },
    "window-size": {
      type: "string",
      description: 'Window size with unit, e.g. "3600s".',
      default: "3600s",
    },
    ...commonOutputArgs,
  },
  run({ args }) {
    const type = ensureType(args.type);
    return run(
      { command: `rollup window ${type}`, flags: args, meta: { dataType: type } },
      async () => {
        const { client } = await buildClient();
        return client.dataPoints.rollUp(type, {
          range: { startTime: args.from, endTime: args.to },
          windowSize: args["window-size"],
        });
      },
    );
  },
});

const daily = defineCommand({
  meta: { name: "daily", description: "Roll up by calendar day(s) using civil time." },
  args: {
    type: { type: "positional", description: "Data type.", required: true },
    from: { type: "string", description: "Start date (YYYY-MM-DD).", required: true },
    to: { type: "string", description: "End date (YYYY-MM-DD).", required: true },
    "window-days": { type: "string", description: "Days per rollup window.", default: "1" },
    ...commonOutputArgs,
  },
  run({ args }) {
    const type = ensureType(args.type);
    return run(
      { command: `rollup daily ${type}`, flags: args, meta: { dataType: type } },
      async () => {
        const { client } = await buildClient();
        return client.dataPoints.dailyRollUp(type, {
          range: { start: { date: parseDate(args.from) }, end: { date: parseDate(args.to) } },
          windowSizeDays: Number(args["window-days"]),
        });
      },
    );
  },
});

export const rollupCmd = defineCommand({
  meta: { name: "rollup", description: "Server-side aggregation (rollUp + dailyRollUp)." },
  subCommands: { window, daily },
});
