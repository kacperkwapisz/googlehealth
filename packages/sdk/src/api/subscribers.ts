import { GoogleHealthError } from "../errors.ts";
import type { HttpClient, Query } from "../http.ts";

/**
 * Webhook subscribers under `projects/{project}/subscribers/{id}`. Each
 * subscriber describes a Pub/Sub topic to fan out data-change notifications
 * to. After the Google migration push notifications are delivered via Google
 * Cloud Pub/Sub rather than the legacy Fitbit subscription endpoints.
 */
export interface Subscriber {
  name?: string;
  endpointUri?: string;
  pubsubTopic?: string;
  dataTypes?: string[];
  [k: string]: unknown;
}

export interface SubscriberListResponse {
  subscribers: Subscriber[];
  nextPageToken?: string;
}

export interface ListSubscribersOptions {
  pageSize?: number;
  pageToken?: string;
  signal?: AbortSignal;
}

export interface PatchSubscriberOptions {
  /** Field mask: comma-separated paths the API should overwrite. */
  updateMask: string;
  signal?: AbortSignal;
}

export class SubscribersApi {
  constructor(private readonly http: HttpClient) {}

  list(project: string, options: ListSubscribersOptions = {}): Promise<SubscriberListResponse> {
    requireProject(project);
    const query: Query = {};
    if (options.pageSize !== undefined) query.pageSize = options.pageSize;
    if (options.pageToken !== undefined) query.pageToken = options.pageToken;
    return this.http.request<SubscriberListResponse>(`/projects/${project}/subscribers`, {
      method: "GET",
      query,
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  }

  get(name: string, signal?: AbortSignal): Promise<Subscriber> {
    const path = ensureSubscriberPath(name);
    return this.http.request<Subscriber>(path, {
      method: "GET",
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  create(
    project: string,
    subscriberId: string,
    body: Omit<Subscriber, "name">,
    signal?: AbortSignal,
  ): Promise<Subscriber> {
    requireProject(project);
    return this.http.request<Subscriber>(`/projects/${project}/subscribers`, {
      method: "POST",
      query: { subscriberId },
      body,
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  patch(
    name: string,
    body: Partial<Subscriber>,
    options: PatchSubscriberOptions,
  ): Promise<Subscriber> {
    const path = ensureSubscriberPath(name);
    return this.http.request<Subscriber>(path, {
      method: "PATCH",
      query: { updateMask: options.updateMask },
      body,
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  }

  delete(name: string, signal?: AbortSignal): Promise<unknown> {
    const path = ensureSubscriberPath(name);
    return this.http.request(path, {
      method: "DELETE",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}

function requireProject(project: string) {
  if (!project) {
    throw new GoogleHealthError({
      code: "BAD_REQUEST",
      message: "Subscribers API requires a Google Cloud project ID.",
      hint: "Pass the project as the first argument or via --project.",
    });
  }
}

function ensureSubscriberPath(name: string): string {
  if (name.startsWith("/")) return name;
  if (name.startsWith("projects/")) return `/${name}`;
  throw new GoogleHealthError({
    code: "BAD_REQUEST",
    message: `Expected subscriber resource name like "projects/<project>/subscribers/<id>", got "${name}".`,
  });
}
