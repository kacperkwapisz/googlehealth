import { readFile } from "node:fs/promises";
import { defineCommand } from "citty";
import { buildClient } from "../build-client.ts";
import { run } from "../output/run.ts";
import { commonOutputArgs } from "./_common.ts";

/**
 * `ghealth api <METHOD> <path>` — raw passthrough to any Google Health v4
 * endpoint. The CLI handles auth, retry, and the stable envelope; payload is
 * whatever the API returns. Useful when Google adds a new endpoint before this
 * CLI grows a typed wrapper.
 */
export const apiCmd = defineCommand({
  meta: { name: "api", description: "Raw passthrough to any /v4 endpoint." },
  args: {
    method: { type: "positional", description: "HTTP method.", required: true },
    path: {
      type: "positional",
      description: 'Path beginning with "/", e.g. "/users/me/identity".',
      required: true,
    },
    body: { type: "string", description: "Inline JSON body." },
    "body-file": { type: "string", description: "Read JSON body from a file." },
    query: { type: "string", description: "Inline query string, e.g. pageSize=50&filter=..." },
    ...commonOutputArgs,
  },
  run({ args }) {
    return run({ command: `api ${args.method} ${args.path}`, flags: args }, async () => {
      const { client } = await buildClient();
      const method = args.method.toUpperCase() as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
      let body: unknown;
      if (args["body-file"]) body = JSON.parse(await readFile(args["body-file"], "utf8"));
      else if (args.body) body = JSON.parse(args.body);
      const query: Record<string, string> = {};
      if (args.query) {
        for (const [k, v] of new URLSearchParams(args.query)) query[k] = v;
      }
      return client.raw(args.path, {
        method,
        ...(body !== undefined ? { body } : {}),
        ...(Object.keys(query).length > 0 ? { query } : {}),
      });
    });
  },
});
