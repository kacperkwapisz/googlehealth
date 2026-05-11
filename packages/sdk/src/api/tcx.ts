import { GoogleHealthError } from "../errors.ts";
import type { HttpClient } from "../http.ts";

/**
 * Export an exercise data point as TCX (Training Center XML). Returns the raw
 * XML body as a string.
 *
 * `name` is the full exercise resource name, e.g.
 * `users/me/dataTypes/exercise/dataPoints/<id>`.
 */
export class TcxApi {
  constructor(private readonly http: HttpClient) {}

  async export(name: string, signal?: AbortSignal): Promise<string> {
    if (!name.includes("dataTypes/exercise/dataPoints/")) {
      throw new GoogleHealthError({
        code: "BAD_REQUEST",
        message: `TCX export expects an exercise data point name; got "${name}".`,
        hint: "Pass the full resource name from a `dataPoints.list('exercise', ...)` response.",
      });
    }
    const path = name.startsWith("/")
      ? `${name}:exportExerciseTcx`
      : `/${name}:exportExerciseTcx`;
    return this.http.request<string>(path, {
      method: "GET",
      accept: "application/xml",
      responseType: "text",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}
