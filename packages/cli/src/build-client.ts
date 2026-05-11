import {
  AuthError,
  createOAuthProvider,
  GoogleHealth,
  type GoogleHealthOptions,
  StaticTokenAuth,
} from "googlehealth";
import { FileTokenStore } from "./config/file-token-store.ts";
import { type CliConfig, loadConfig } from "./config/store.ts";

export interface BuildClientResult {
  client: GoogleHealth;
  config: CliConfig;
}

/**
 * Compose a GoogleHealth client from CLI state:
 * - `GHEALTH_ACCESS_TOKEN` → StaticTokenAuth (great for scripts/CI)
 * - otherwise → FileTokenStore + RefreshingTokenAuth (requires client_id)
 */
export async function buildClient(): Promise<BuildClientResult> {
  const config = await loadConfig();
  const directToken = process.env.GHEALTH_ACCESS_TOKEN;
  const options: GoogleHealthOptions = directToken
    ? { auth: new StaticTokenAuth(directToken) }
    : { auth: await oauthAuth(config) };
  if (config.baseUrl) options.baseUrl = config.baseUrl;
  return { client: new GoogleHealth(options), config };
}

async function oauthAuth(config: CliConfig) {
  if (!config.clientId) {
    throw new AuthError({
      message: "No OAuth client ID configured.",
      hint: "Run `ghealth config set client-id <id>` (also `client-secret` if your client is type Web) and `ghealth auth login`, or export GHEALTH_ACCESS_TOKEN to skip OAuth.",
    });
  }
  const store = new FileTokenStore();
  return createOAuthProvider({
    clientId: config.clientId,
    ...(config.clientSecret !== undefined ? { clientSecret: config.clientSecret } : {}),
    store,
  });
}
