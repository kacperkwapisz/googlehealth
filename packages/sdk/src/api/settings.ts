import type { HttpClient } from "../http.ts";

/** `GET /users/me/settings` — user preferences (units, timezone, etc.). */
export type Settings = Record<string, unknown>;

export class SettingsApi {
  constructor(private readonly http: HttpClient) {}

  get(signal?: AbortSignal): Promise<Settings> {
    return this.http.request<Settings>("/users/me/settings", {
      method: "GET",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}
