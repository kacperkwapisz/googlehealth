# googlehealth

[![npm version](https://img.shields.io/npm/v/googlehealth.svg)](https://www.npmjs.com/package/googlehealth)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

> **Unofficial.** Typed TypeScript SDK for the [Google Health API](https://developers.google.com/health). Not affiliated with Google.

```bash
pnpm add googlehealth
# or
npm install googlehealth
```

A primitive for the post-Fitbit-Web-API world. Wraps every endpoint of Google Health API v4, with proper TypeScript types, runtime [zod](https://zod.dev) schemas, PKCE OAuth helpers, automatic retries + pagination, and zero opinions about how you use the data.

## Why this exists

- **Hard deadline.** The legacy Fitbit Web API shuts down **September 30, 2026.** Every Fitbit integration on the planet needs to migrate to Google Health.
- **The Fitbit Air problem.** Google's new Whoop competitor ($99, 12g, no required subscription) is shipping. People want to build their own dashboards on top of it.
- **No serious JS option exists.** Until now.

## Quickstart

```ts
import { GoogleHealth } from "googlehealth";

// Bring your own access token (the simplest path):
const gh = new GoogleHealth({ auth: process.env.GH_TOKEN! });

// Identity (returns both the new Google ID and the legacy Fitbit user ID)
const me = await gh.identity.get();
console.log(me.healthUserId, me.legacyUserId);

// Sleep sessions for the last week
const { dataPoints } = await gh.dataPoints.list("sleep", {
  from: "2026-05-04T00:00:00Z",
  to:   "2026-05-11T00:00:00Z",
});

// Stream all heart-rate samples (auto-paginates)
for await (const point of gh.dataPoints.iterate("heart-rate", { from: "2026-05-10" })) {
  // ...
}
```

## OAuth (PKCE)

The SDK ships pure OAuth helpers — no browser launch, no callback server, both safe to use anywhere `fetch` works (Node, Bun, browsers, RN).

```ts
import {
  buildAuthorizationUrl,
  createOAuthProvider,
  DEFAULT_READ_SCOPES,
  exchangeCode,
  generatePkce,
  GoogleHealth,
  MemoryTokenStore,
  randomState,
} from "googlehealth";

const pkce = await generatePkce();
const state = randomState();

const url = buildAuthorizationUrl({
  clientId: process.env.CLIENT_ID!,
  redirectUri: "http://127.0.0.1:5173/callback",
  scopes: DEFAULT_READ_SCOPES,
  state,
  codeChallenge: pkce.codeChallenge,
});

// ...redirect the user to `url`. Capture `code` from the callback...

const tokens = await exchangeCode({
  clientId: process.env.CLIENT_ID!,
  code,
  redirectUri: "http://127.0.0.1:5173/callback",
  codeVerifier: pkce.codeVerifier,
});

// Plug into a refresh-aware AuthProvider
const store = new MemoryTokenStore(tokens);
const auth = createOAuthProvider({ clientId: process.env.CLIENT_ID!, store });
const gh = new GoogleHealth({ auth });
```

For a complete OAuth loopback flow including a local callback server, install [`googlehealth-cli`](https://www.npmjs.com/package/googlehealth-cli) and use `ghealth auth login`, or look at [`packages/cli/src/auth/loopback.ts`](../cli/src/auth/loopback.ts) for an example to copy.

### Token storage

Implement `TokenStore` to put tokens wherever you want:

```ts
import type { TokenSet, TokenStore } from "googlehealth";

class RedisTokenStore implements TokenStore {
  async get(): Promise<TokenSet | null> { /* ... */ }
  async set(tokens: TokenSet): Promise<void> { /* ... */ }
  async clear(): Promise<void> { /* ... */ }
}
```

The CLI bundles a 0600 file-backed store at `~/.config/googlehealth/credentials.json`.

## Data types

```ts
import { DATA_TYPES, getDataType, listDataTypes, scopeFor } from "googlehealth";

listDataTypes().length; // 31
getDataType("heart-rate"); // { name, snakeName, field, record, scope, operations, webhook }
scopeFor("steps", true);   // "https://www.googleapis.com/auth/googlehealth.activity_and_fitness"
```

| Record type | Examples |
| --- | --- |
| `sample` | heart-rate, heart-rate-variability, oxygen-saturation, weight, height, body-fat, vo2-max |
| `interval` | steps, distance, active-zone-minutes, altitude, floors, sedentary-period, total-calories |
| `daily` | daily-heart-rate-variability, daily-resting-heart-rate, daily-oxygen-saturation, daily-vo2-max |
| `session` | sleep, exercise, hydration-log |

## API surface

```ts
gh.dataPoints.list(type, { from, to, filter, pageSize, pageToken });
gh.dataPoints.iterate(type, opts); // AsyncIterable, auto-paginates
gh.dataPoints.get(name);
gh.dataPoints.reconcile(type, { dataSourceFamily, from, to });
gh.dataPoints.rollUp(type, { range, windowSize });
gh.dataPoints.dailyRollUp(type, { range, windowSizeDays });
gh.dataPoints.patch(type, id, body);
gh.dataPoints.batchDelete(type, names);

gh.identity.get();
gh.profile.get();
gh.settings.get();

gh.subscribers.list(project);
gh.subscribers.get(name);
gh.subscribers.create(project, id, body);
gh.subscribers.patch(name, body, { updateMask });
gh.subscribers.delete(name);

gh.tcx.export(exerciseName); // returns TCX XML

gh.raw<T>("/users/me/identity"); // typed passthrough
```

## Schemas subpath

If you only need types + zod validation (no fetch, no OAuth), import the lighter subpath:

```ts
import { dataPointSchema, intervalSchema, DATA_TYPES } from "googlehealth/schemas";
```

Useful for React Native, Next.js Server Components, MCP servers, etc.

## Error handling

Every error is a `GoogleHealthError` subclass with a stable `code`:

```ts
import { AuthError, GoogleHealthError, RateLimitError } from "googlehealth";

try {
  await gh.dataPoints.list("heart-rate");
} catch (err) {
  if (err instanceof AuthError) /* re-auth */;
  if (err instanceof RateLimitError) /* backoff */;
  if (err instanceof GoogleHealthError) {
    console.log(err.code, err.status, err.hint, err.retryable);
  }
}
```

Auto-retries on `5xx`, `429`, and network errors (exponential backoff with jitter; honors `Retry-After`). Token refresh happens transparently when you use `RefreshingTokenAuth` / `createOAuthProvider`.

## Runtimes

| Runtime | Status |
| --- | --- |
| Node 20+ | First-class |
| Bun 1.0+ | First-class |
| Browsers (modern) | Works via `fetch` + Web Crypto |
| React Native | Works with `react-native-get-random-values` polyfill |
| Cloudflare Workers / Vercel Edge | Works (pass `fetch: globalThis.fetch`) |

## License

MIT
