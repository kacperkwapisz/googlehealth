import type { HttpClient } from "../http.ts";

/**
 * `GET /users/me/profile` — returns the user's profile (display name, gender,
 * dob, country, etc.). Exact field set is determined by Google.
 */
export type Profile = Record<string, unknown>;

export class ProfileApi {
  constructor(private readonly http: HttpClient) {}

  get(signal?: AbortSignal): Promise<Profile> {
    return this.http.request<Profile>("/users/me/profile", {
      method: "GET",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}
