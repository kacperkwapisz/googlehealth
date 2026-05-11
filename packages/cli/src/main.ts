import { defineCommand, runMain } from "citty";
import { VERSION } from "googlehealth";
import { buildAgentCmd } from "./commands/agent.ts";
import { apiCmd } from "./commands/api.ts";
import { authCmd } from "./commands/auth.ts";
import { configCmd } from "./commands/config.ts";
import { dataCmd } from "./commands/data.ts";
import { doctorCmd } from "./commands/doctor.ts";
import { identityCmd } from "./commands/identity.ts";
import { profileCmd } from "./commands/profile.ts";
import { rollupCmd } from "./commands/rollup.ts";
import { settingsCmd } from "./commands/settings.ts";
import { subscribersCmd } from "./commands/subscribers.ts";
import { tcxCmd } from "./commands/tcx.ts";
import { typesCmd } from "./commands/types.ts";

const main = defineCommand({
  meta: {
    name: "ghealth",
    version: VERSION,
    description:
      "Unofficial CLI for the Google Health API. Stable `--json` envelope; safe for jq and AI agents.",
  },
  subCommands: {
    auth: authCmd,
    config: configCmd,
    doctor: doctorCmd,
    types: typesCmd,
    data: dataCmd,
    rollup: rollupCmd,
    identity: identityCmd,
    profile: profileCmd,
    settings: settingsCmd,
    subscribers: subscribersCmd,
    tcx: tcxCmd,
    api: apiCmd,
    agent: buildAgentCmd({ subCommands: {} } as never),
  },
});

// `agent manifest` describes every other command; rebuild it once `main` exists.
(main.subCommands as Record<string, unknown>).agent = buildAgentCmd(main);

runMain(main);
