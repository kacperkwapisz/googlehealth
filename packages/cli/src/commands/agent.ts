import { type CommandDef, defineCommand } from "citty";
import { DATA_TYPE_NAMES, VERSION as SDK_VERSION } from "googlehealth";
import { ExitCode } from "../exit-codes.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

interface ArgDescriptor {
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  positional?: boolean;
}

interface CommandDescriptor {
  description?: string;
  args?: Record<string, ArgDescriptor>;
  subCommands?: Record<string, CommandDescriptor>;
}

interface Manifest {
  name: string;
  version: string;
  sdkVersion: string;
  description: string;
  exitCodes: Record<number, string>;
  envelope: {
    success: {
      ok: true;
      data: "<command-specific>";
      meta: { command: string; durationMs: number };
    };
    error: { ok: false; error: { code: string; message: string }; meta: object };
  };
  dataTypes: readonly string[];
  commands: Record<string, CommandDescriptor>;
}

/**
 * `ghealth agent manifest` — emit a machine-readable description of the
 * entire CLI surface so AI agents can introspect what's available without
 * round-tripping `--help` or guessing argument names.
 */
export function buildAgentCmd(root: CommandDef): CommandDef {
  return defineCommand({
    meta: { name: "agent", description: "Machine-readable interface for AI agents." },
    subCommands: {
      manifest: defineCommand({
        meta: { name: "manifest", description: "Print the CLI manifest as JSON." },
        args: commonOutputArgs,
        run({ args }) {
          return run({ command: "agent manifest", flags: { ...args, json: true } }, async () => {
            const manifest: Manifest = {
              name: "ghealth",
              version: SDK_VERSION,
              sdkVersion: SDK_VERSION,
              description: "Unofficial CLI for the Google Health API.",
              exitCodes: {
                [ExitCode.Ok]: "ok",
                [ExitCode.UserError]: "user-error",
                [ExitCode.Auth]: "authentication-error",
                [ExitCode.ApiClient]: "api-4xx",
                [ExitCode.ApiServer]: "api-5xx",
                [ExitCode.Network]: "network-error",
                [ExitCode.Usage]: "usage-error",
              },
              envelope: {
                success: {
                  ok: true,
                  data: "<command-specific>",
                  meta: { command: "<command>", durationMs: 0 },
                },
                error: {
                  ok: false,
                  error: { code: "<code>", message: "<message>" },
                  meta: {},
                },
              },
              dataTypes: DATA_TYPE_NAMES,
              commands: describeSubCommands(root.subCommands),
            };
            return manifest;
          });
        },
      }),
    },
  });
}

function describeSubCommands(subs: CommandDef["subCommands"]): Record<string, CommandDescriptor> {
  if (!subs || typeof subs === "function") return {};
  const out: Record<string, CommandDescriptor> = {};
  for (const [name, cmd] of Object.entries(subs)) {
    if (typeof cmd === "function") continue;
    out[name] = describeCommand(cmd);
  }
  return out;
}

function describeCommand(cmd: CommandDef): CommandDescriptor {
  const desc: CommandDescriptor = {};
  if (cmd.meta && typeof cmd.meta === "object" && "description" in cmd.meta) {
    desc.description = cmd.meta.description as string | undefined;
  }
  if (cmd.args && typeof cmd.args === "object") {
    const args: Record<string, ArgDescriptor> = {};
    for (const [key, arg] of Object.entries(cmd.args)) {
      if (typeof arg !== "object" || arg === null) continue;
      const a = arg as Record<string, unknown>;
      const out: ArgDescriptor = { type: (a.type as string) ?? "string" };
      if (typeof a.description === "string") out.description = a.description;
      if (a.required === true) out.required = true;
      if (a.default !== undefined) out.default = a.default;
      if (a.type === "positional") out.positional = true;
      args[key] = out;
    }
    desc.args = args;
  }
  const subs = describeSubCommands(cmd.subCommands);
  if (Object.keys(subs).length > 0) desc.subCommands = subs;
  return desc;
}
