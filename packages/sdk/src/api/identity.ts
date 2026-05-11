import type { HttpClient } from "../http.ts";

/**
 * `GET /users/me/identity` — returns both the Google user ID and the legacy
 * Fitbit user ID for the authenticated user. Call this right after OAuth and
 * persist both for backward/forward compatibility.
 *
 * @see https://developers.google.com/health/reference/rest/v4/users/getIdentity
 */
export interface Identity {
  name: string;
  legacyUserId: string;
  healthUserId: string;
}

export class IdentityApi {
  constructor(private readonly http: HttpClient) {}

  get(signal?: AbortSignal): Promise<Identity> {
    return this.http.request<Identity>("/users/me/identity", {
      method: "GET",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}
