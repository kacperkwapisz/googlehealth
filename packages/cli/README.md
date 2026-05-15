# googlehealth-cli

[![npm version](https://img.shields.io/npm/v/googlehealth-cli.svg)](https://www.npmjs.com/package/googlehealth-cli)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

> **Unofficial.** CLI for the [Google Health API](https://developers.google.com/health). Not affiliated with Google.

```bash
npm i -g googlehealth-cli
# both binaries are installed; `ghealth` is the canonical short form
ghealth --help
googlehealth --help
```

Wraps the [`googlehealth`](https://www.npmjs.com/package/googlehealth) SDK with a stable `--json` envelope, designed to compose with `jq` and AI agents out of the box. Built for the September 30, 2026 Fitbit Web API shutdown.

## Quickstart

```bash
# 1. One-time: bring your own Google OAuth client
ghealth config set client-id <YOUR_CLIENT_ID>
ghealth config set client-secret <YOUR_CLIENT_SECRET>  # only for Web clients

# 2. Authorize (opens browser, captures code via local loopback)
ghealth auth login

# 3. Use it
ghealth identity get
ghealth types list --record sample
ghealth data list heart-rate --from 2026-05-10 --to 2026-05-11 --json | jq '.data.dataPoints | length'
ghealth data list sleep --from 2026-05-04 --format csv > sleep.csv
ghealth tcx export "users/me/dataTypes/exercise/dataPoints/abc123" --out workout.tcx
```

You can skip OAuth entirely by setting `GHEALTH_ACCESS_TOKEN=<token>` — useful for CI and one-off scripts.

## Stable `--json` envelope

Every command — including errors — returns the same shape:

```json
{
  "ok": true,
  "data": <command-specific>,
  "meta": { "command": "data list heart-rate" }
}
```

```json
{
  "ok": false,
  "error": { "code": "AUTH", "message": "Unauthorized.", "retryable": false, "hint": "...", "status": 401 },
  "meta": { "command": "data list heart-rate" }
}
```

`jq` paths never break: `.ok`, `.data`, `.error`, `.meta` are always present at the right places. Errors go to stderr; success goes to stdout. Exit codes are stable (see below).

## Output formats

```bash
ghealth data list steps --from 2026-05-01 --json       # full envelope
ghealth data list steps --from 2026-05-01 --format ndjson # one JSON object per line
ghealth data list steps --from 2026-05-01 --format csv    # flattened dot-paths
ghealth data list steps --from 2026-05-01 --format markdown
ghealth data list steps --from 2026-05-01               # auto: table on TTY, json on pipe
```

Auto-pagination is on by default (capped at `--limit 1000`, set `--limit 0` for unlimited).

## Configuration

| Source | Wins | Notes |
| --- | --- | --- |
| `GHEALTH_*` env vars | first | `GHEALTH_ACCESS_TOKEN`, `GHEALTH_CLIENT_ID`, `GHEALTH_CLIENT_SECRET`, `GHEALTH_PROJECT`, `GHEALTH_BASE_URL`, `GHEALTH_CONFIG_DIR` |
| Config file | second | `~/.config/googlehealth/config.json` (also `XDG_CONFIG_HOME` aware) |
| Defaults | last | Built into the CLI |

Credentials are stored separately at `~/.config/googlehealth/credentials.json` with `0600` permissions. `ghealth doctor` summarizes the entire local state.

## Commands

```
ghealth auth           login | logout | status
ghealth config         get [key] | set <key> <value> | unset <key>
ghealth doctor
ghealth types          list [--scope --record] | describe <name>
ghealth data           list <type> | get <name> | reconcile <type> | delete <type> --names
ghealth rollup         window <type> --from --to --window-size
                       daily  <type> --from --to --window-days
ghealth identity       get
ghealth profile        get
ghealth settings       get
ghealth subscribers    list <project> | get <name> | delete <name>
ghealth tcx            export <name> [--out file]
ghealth api            <METHOD> <path> [--body | --body-file | --query]
ghealth agent          manifest
```

## AI agent integration

`ghealth agent manifest` prints a machine-readable description of the entire CLI surface — every command, its args, its types, and the exit-code contract:

```bash
ghealth agent manifest | jq '.data.commands.data.subCommands.list.args'
```

Combined with stable exit codes, this means an AI agent can plan and run shell commands without scraping `--help`:

| Exit | Meaning |
| --- | --- |
| `0` | OK |
| `1` | User error |
| `2` | Authentication required / failed |
| `3` | API client error (4xx) |
| `4` | API server error (5xx) |
| `5` | Network error |
| `64` | Usage error |

## Examples

```bash
# Daily resting HR for the last 30 days, as CSV
ghealth data list daily-resting-heart-rate --from "$(date -v-30d -u +%Y-%m-%dT00:00:00Z)" --format csv

# How many sleep sessions did I have last week?
ghealth data list sleep --from "$(date -v-7d -u +%Y-%m-%dT00:00:00Z)" --json | jq '.data.dataPoints | length'

# Average daily HRV
ghealth data list daily-heart-rate-variability --from 2026-04-01 --format ndjson \
  | jq -s 'map(.dailyHeartRateVariability.rmssd) | add / length'

# Roll up steps into 1-hour windows for analysis
ghealth rollup window steps \
  --from 2026-05-10T00:00:00Z --to 2026-05-11T00:00:00Z \
  --window-size 3600s --json

# Raw passthrough for new endpoints not yet wrapped
ghealth api GET /users/me/identity
```

## License

MIT
