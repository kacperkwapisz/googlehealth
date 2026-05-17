# googlehealth

> Unofficial. Not affiliated with Google.

The Bun + TypeScript stack for the [Google Health API](https://developers.google.com/health). Built for the September 30, 2026 Fitbit Web API shutdown — and for everyone building dashboards, agents, and integrations on top of Fitbit Air and other Google Health devices.

This is a monorepo. Two packages ship from here:

| Package | Install | Use it for |
| --- | --- | --- |
| **[`googlehealth`](./packages/sdk)** | `npm install googlehealth` | The typed SDK. Dashboards, mobile apps, custom integrations, anything that needs the Google Health API in TypeScript. |
| **[`googlehealth-cli`](./packages/cli)** | `npm install -g googlehealth-cli` | The `ghealth` / `googlehealth` binary. Shell scripting, data export, AI agents via `--json`, OAuth setup. |

## Why this exists

- **Hard migration deadline.** The legacy Fitbit Web API shuts down September 30, 2026. Every Fitbit integration on the planet must move to the Google Health API. There is no serious JS/TS option for it. There is now.
- **Broken data export.** Since the Google migration, Fitbit users can only get their data as a 2GB Google Takeout JSON dump with no date-range selection. A typed SDK and a CLI with `--from`/`--to` flags is the obvious fix.
- **Whoop exit ramp.** The Fitbit Air ($99, 12g, no required subscription) is the cleanest off-ramp from Whoop's subscription model. People want to build their own dashboards on top of it. This is the primitive they reach for.

## Scope

This repo ships **primitives**. The SDK wraps every Google Health API v4 endpoint cleanly. The CLI wraps the SDK with stable `--json` for shell and AI use. Recovery scores, dashboards, exports, agents, MCP servers — all of that is user-land. We give you the sharp tool, you build the thing.

## Status

Early development. APIs may shift before 1.0.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Workspace layout:

```
packages/
├── sdk/    # → publishes `googlehealth`
└── cli/    # → publishes `googlehealth-cli`, depends on `googlehealth`
```

## Releases

Both packages ship in lockstep — they always share the same version number and release together.

- [`googlehealth` CHANGELOG](./packages/sdk/CHANGELOG.md)
- [`googlehealth-cli` CHANGELOG](./packages/cli/CHANGELOG.md)

Releases are cut from `main` with `pnpm release:patch | release:minor | release:major` (or `pnpm release <semver>`). The script bumps versions, promotes each package's `## [Unreleased]` section to a dated release heading, commits, tags `v<version>`, and pushes. The tag push triggers GitHub Actions, which builds, tests, publishes both packages to npm with provenance, and creates a GitHub Release with combined changelog notes.

## License

MIT
