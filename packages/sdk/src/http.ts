import type { AuthProvider } from "./auth/provider.ts";
import {
  AuthError,
  GoogleHealthError,
  HttpError,
  NetworkError,
  RateLimitError,
  statusToCode,
} from "./errors.ts";

export const DEFAULT_BASE_URL = "https://health.googleapis.com/v4";
export const DEFAULT_USER_AGENT = "googlehealth-sdk-js";

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue | readonly QueryValue[]>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Max retries on retryable errors (5xx, 429, network). Default 3. */
  retries?: number;
  /** Skip auth header; for unauthenticated endpoints (rare). */
  noAuth?: boolean;
  /** Override Accept header. Defaults to application/json. */
  accept?: string;
  /** How to parse the response body. Defaults to "json". */
  responseType?: "json" | "text";
}

export interface HttpClientOptions {
  baseUrl?: string;
  auth: AuthProvider;
  /** Override `globalThis.fetch`. */
  fetch?: typeof fetch;
  userAgent?: string;
  /** Base delay for exponential backoff, ms. */
  retryBaseMs?: number;
}

interface PagedResponse {
  nextPageToken?: string;
  [key: string]: unknown;
}

export class HttpClient {
  readonly baseUrl: string;
  readonly auth: AuthProvider;
  readonly userAgent: string;
  readonly retryBaseMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: HttpClientOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.auth = options.auth;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.retryBaseMs = options.retryBaseMs ?? 500;
    const f = options.fetch ?? globalThis.fetch;
    if (!f) {
      throw new GoogleHealthError({
        code: "UNKNOWN",
        message: "No `fetch` implementation available. Pass one via the `fetch` option.",
      });
    }
    this.#fetch = f.bind(globalThis);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const retries = options.retries ?? 3;
    const url = this.buildUrl(path, options.query);

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retries) {
      try {
        return await this.#once<T>(method, url, options);
      } catch (err) {
        lastError = err;
        if (!shouldRetry(err) || attempt === retries) throw err;
        const delay = backoffMs(this.retryBaseMs, attempt, err);
        await sleep(delay, options.signal);
        attempt += 1;
      }
    }
    throw lastError;
  }

  async *paginate<T>(
    path: string,
    options: RequestOptions & { itemsKey: string; pageTokenParam?: string } = {
      itemsKey: "dataPoints",
    },
  ): AsyncIterable<T> {
    const itemsKey = options.itemsKey ?? "dataPoints";
    const pageTokenParam = options.pageTokenParam ?? "pageToken";
    let pageToken: string | undefined;
    do {
      const query: Query = { ...(options.query ?? {}) };
      if (pageToken) query[pageTokenParam] = pageToken;
      const page = await this.request<PagedResponse>(path, { ...options, query });
      const items = (page[itemsKey] ?? []) as T[];
      for (const item of items) yield item;
      pageToken = page.nextPageToken;
    } while (pageToken);
  }

  buildUrl(path: string, query?: Query): string {
    const base = path.startsWith("http")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return base;
    const search = new URLSearchParams();
    for (const [key, raw] of Object.entries(query)) {
      if (raw === undefined || raw === null) continue;
      if (Array.isArray(raw)) {
        for (const v of raw) {
          if (v === undefined || v === null) continue;
          search.append(key, String(v));
        }
      } else {
        search.append(key, String(raw));
      }
    }
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async #once<T>(method: string, url: string, options: RequestOptions): Promise<T> {
    const headers = new Headers({
      Accept: options.accept ?? "application/json",
      "User-Agent": this.userAgent,
    });
    if (!options.noAuth) {
      const token = await this.auth.getAccessToken();
      headers.set("Authorization", `Bearer ${token}`);
    }
    let body: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.#fetch(url, {
        method,
        headers,
        body,
        signal: options.signal ?? null,
      });
    } catch (err) {
      if (isAbort(err)) {
        throw new GoogleHealthError({ code: "ABORTED", message: "Request aborted.", cause: err });
      }
      throw new NetworkError({ message: networkMessage(err), cause: err });
    }

    if (response.ok) {
      return options.responseType === "text"
        ? ((await response.text()) as T)
        : parseJson<T>(response);
    }

    if (response.status === 401) {
      await this.auth.invalidate?.();
      throw new AuthError({
        message: "Unauthorized.",
        status: 401,
        hint: "Token may be expired or scopes insufficient. Re-authenticate.",
        details: await safeBody(response),
      });
    }

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      throw new RateLimitError({
        message: "Rate limited by the Google Health API.",
        status: 429,
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        details: await safeBody(response),
      });
    }

    throw new HttpError({
      code: statusToCode(response.status),
      status: response.status,
      message: `Google Health API error: HTTP ${response.status}.`,
      retryable: response.status >= 500,
      details: await safeBody(response),
    });
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new GoogleHealthError({
      code: "UNKNOWN",
      message: "Failed to parse Google Health API response as JSON.",
      cause: err,
      details: text,
    });
  }
}

async function safeBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function shouldRetry(err: unknown): boolean {
  if (err instanceof GoogleHealthError) return err.retryable;
  return false;
}

function backoffMs(baseMs: number, attempt: number, err: unknown): number {
  if (err instanceof RateLimitError && err.retryAfterMs !== undefined) return err.retryAfterMs;
  const jitter = Math.random() * baseMs;
  return baseMs * 2 ** attempt + jitter;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError(signal));
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(signal?: AbortSignal) {
  return new GoogleHealthError({
    code: "ABORTED",
    message: "Aborted while waiting to retry.",
    cause: signal?.reason,
  });
}

function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError")
  );
}

function networkMessage(err: unknown): string {
  if (err instanceof Error && err.message) return `Network error: ${err.message}.`;
  return "Network error contacting health.googleapis.com.";
}
