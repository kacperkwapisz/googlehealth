import { DataPointsApi } from "./api/data-points.ts";
import { IdentityApi } from "./api/identity.ts";
import { ProfileApi } from "./api/profile.ts";
import { SettingsApi } from "./api/settings.ts";
import { SubscribersApi } from "./api/subscribers.ts";
import { TcxApi } from "./api/tcx.ts";
import { type AuthProvider, StaticTokenAuth } from "./auth/provider.ts";
import { HttpClient, type HttpClientOptions, type RequestOptions } from "./http.ts";

export interface GoogleHealthOptions {
  /** OAuth access token, or an AuthProvider for refresh-aware setups. */
  auth: string | AuthProvider;
  /** Override the API base URL. Defaults to `https://health.googleapis.com/v4`. */
  baseUrl?: string;
  /** Override fetch (e.g. for testing or edge runtimes). */
  fetch?: typeof fetch;
  /** Custom User-Agent. */
  userAgent?: string;
  /** Retry base delay in ms. Default 500. */
  retryBaseMs?: number;
}

/**
 * Top-level entry point for the Google Health API.
 *
 * ```ts
 * const gh = new GoogleHealth({ auth: process.env.GH_TOKEN! });
 * const { dataPoints } = await gh.dataPoints.list("heart-rate", {
 *   from: "2026-05-10",
 *   to: "2026-05-11",
 * });
 * ```
 */
export class GoogleHealth {
  readonly http: HttpClient;
  readonly dataPoints: DataPointsApi;
  readonly identity: IdentityApi;
  readonly profile: ProfileApi;
  readonly settings: SettingsApi;
  readonly subscribers: SubscribersApi;
  readonly tcx: TcxApi;

  constructor(options: GoogleHealthOptions) {
    const auth =
      typeof options.auth === "string" ? new StaticTokenAuth(options.auth) : options.auth;
    const httpOpts: HttpClientOptions = { auth };
    if (options.baseUrl !== undefined) httpOpts.baseUrl = options.baseUrl;
    if (options.fetch !== undefined) httpOpts.fetch = options.fetch;
    if (options.userAgent !== undefined) httpOpts.userAgent = options.userAgent;
    if (options.retryBaseMs !== undefined) httpOpts.retryBaseMs = options.retryBaseMs;
    this.http = new HttpClient(httpOpts);
    this.dataPoints = new DataPointsApi(this.http);
    this.identity = new IdentityApi(this.http);
    this.profile = new ProfileApi(this.http);
    this.settings = new SettingsApi(this.http);
    this.subscribers = new SubscribersApi(this.http);
    this.tcx = new TcxApi(this.http);
  }

  /** Raw passthrough. Returns the parsed JSON body for any v4 endpoint. */
  raw<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.request<T>(path, options);
  }
}
