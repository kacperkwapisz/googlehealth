import { GoogleHealthError } from "../errors.ts";
import type { HttpClient, Query } from "../http.ts";
import type { DataPoint, DataPointListResponse, RollupResponse } from "../types/data-point.ts";
import { DATA_TYPES, type DataPointOperation, type DataTypeName } from "../types/data-types.ts";
import { buildTimeFilter, type TimeInput } from "./filters.ts";

export interface ListOptions {
  /** Items per page. Google caps at API-defined max (currently 1000). */
  pageSize?: number;
  /** Continue from a previous response's `nextPageToken`. */
  pageToken?: string;
  /** Raw `filter=` expression. Takes precedence over `from`/`to`. */
  filter?: string;
  /** Convenience: composes a time filter using the data type's metadata. */
  from?: TimeInput;
  to?: TimeInput;
  /** Optional ordering, e.g. `interval.start_time desc`. */
  orderBy?: string;
  signal?: AbortSignal;
}

export interface ReconcileOptions extends ListOptions {
  /**
   * Data-source family. Use `users/me/dataSourceFamilies/all-sources` for
   * everything, or a specific family like `google-wearables`.
   */
  dataSourceFamily?: string;
}

export interface RollUpRequest {
  range: {
    startTime: string;
    endTime: string;
  };
  /** Window size in seconds (e.g. `"3600s"`) per the Google API. */
  windowSize: string;
}

export interface DailyRollUpRequest {
  range: {
    start: CivilTimestamp;
    end: CivilTimestamp;
  };
  windowSizeDays: number;
}

export interface CivilTimestamp {
  date: { year: number; month: number; day: number };
  time?: { hours?: number; minutes?: number; seconds?: number; nanos?: number };
}

export interface BatchDeleteRequest {
  names: string[];
}

/** Resource client for `users/me/dataTypes/<type>/dataPoints`. */
export class DataPointsApi {
  constructor(private readonly http: HttpClient) {}

  /** Page through a data type. Returns `{ dataPoints, nextPageToken? }`. */
  list<TPayload = unknown>(
    type: DataTypeName,
    options: ListOptions = {},
  ): Promise<DataPointListResponse<TPayload>> {
    assertOp(type, "list");
    const path = `/users/me/dataTypes/${type}/dataPoints`;
    return this.http.request<DataPointListResponse<TPayload>>(path, {
      method: "GET",
      query: listQuery(type, options),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  }

  /** Stream every data point across pages. */
  async *iterate<TPayload = unknown>(
    type: DataTypeName,
    options: ListOptions = {},
  ): AsyncIterable<DataPoint<TPayload>> {
    assertOp(type, "list");
    const path = `/users/me/dataTypes/${type}/dataPoints`;
    yield* this.http.paginate<DataPoint<TPayload>>(path, {
      itemsKey: "dataPoints",
      query: listQuery(type, options),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  }

  /** Get a single data point by its full resource name. */
  get<TPayload = unknown>(name: string, signal?: AbortSignal): Promise<DataPoint<TPayload>> {
    const path = ensureResourcePath(name);
    return this.http.request<DataPoint<TPayload>>(path, {
      method: "GET",
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  /** Reconciled list across multiple data sources. */
  reconcile<TPayload = unknown>(
    type: DataTypeName,
    options: ReconcileOptions = {},
  ): Promise<DataPointListResponse<TPayload>> {
    assertOp(type, "reconcile");
    const path = `/users/me/dataTypes/${type}/dataPoints:reconcile`;
    return this.http.request<DataPointListResponse<TPayload>>(path, {
      method: "GET",
      query: reconcileQuery(type, options),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  }

  rollUp<TPayload = unknown>(
    type: DataTypeName,
    request: RollUpRequest,
    signal?: AbortSignal,
  ): Promise<RollupResponse<TPayload>> {
    assertOp(type, "rollUp");
    const path = `/users/me/dataTypes/${type}/dataPoints:rollUp`;
    return this.http.request<RollupResponse<TPayload>>(path, {
      method: "POST",
      body: request,
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  dailyRollUp<TPayload = unknown>(
    type: DataTypeName,
    request: DailyRollUpRequest,
    signal?: AbortSignal,
  ): Promise<RollupResponse<TPayload>> {
    assertOp(type, "dailyRollUp");
    const path = `/users/me/dataTypes/${type}/dataPoints:dailyRollUp`;
    return this.http.request<RollupResponse<TPayload>>(path, {
      method: "POST",
      body: request,
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  /** Insert or update a single data point. */
  patch<TPayload = unknown>(
    type: DataTypeName,
    id: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<DataPoint<TPayload>> {
    assertOp(type, "update");
    const path = `/users/me/dataTypes/${type}/dataPoints/${encodeURIComponent(id)}`;
    return this.http.request<DataPoint<TPayload>>(path, {
      method: "PATCH",
      body,
      ...(signal !== undefined ? { signal } : {}),
    });
  }

  /** Batch-delete by full resource names. */
  batchDelete(
    type: DataTypeName,
    names: readonly string[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    assertOp(type, "batchDelete");
    const path = `/users/me/dataTypes/${type}/dataPoints:batchDelete`;
    return this.http.request(path, {
      method: "POST",
      body: { names },
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}

function listQuery(type: DataTypeName, options: ListOptions): Query {
  const query: Query = {};
  if (options.pageSize !== undefined) query.pageSize = options.pageSize;
  if (options.pageToken !== undefined) query.pageToken = options.pageToken;
  if (options.orderBy !== undefined) query.orderBy = options.orderBy;
  const filter =
    options.filter ?? buildTimeFilter(DATA_TYPES[type], { from: options.from, to: options.to });
  if (filter !== undefined) query.filter = filter;
  return query;
}

function reconcileQuery(type: DataTypeName, options: ReconcileOptions): Query {
  const query = listQuery(type, options);
  if (options.dataSourceFamily !== undefined) {
    query.dataSourceFamily = options.dataSourceFamily;
  }
  return query;
}

function assertOp(type: DataTypeName, op: DataPointOperation) {
  const ops = DATA_TYPES[type].operations as readonly DataPointOperation[];
  if (!ops.includes(op)) {
    throw new GoogleHealthError({
      code: "BAD_REQUEST",
      message: `Data type "${type}" does not support operation "${op}".`,
      hint: `Supported: ${ops.join(", ")}.`,
    });
  }
}

function ensureResourcePath(name: string): string {
  if (name.startsWith("/")) return name;
  if (name.startsWith("users/")) return `/${name}`;
  throw new GoogleHealthError({
    code: "BAD_REQUEST",
    message: `Expected a full resource name like "users/me/dataTypes/<type>/dataPoints/<id>", got "${name}".`,
  });
}
