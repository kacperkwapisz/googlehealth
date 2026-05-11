import { z } from "zod";
import { dataSourceSchema } from "./common.ts";

/**
 * Base envelope for a Google Health data point. The type-specific payload
 * (e.g. `heartRate`, `sleep`, `steps`) is attached as a sibling field whose
 * name comes from each data type's `field` metadata. We keep the schema loose
 * with `passthrough()` so new Google fields don't break parsing.
 */
export const dataPointBaseSchema = z
  .object({
    name: z.string().optional(),
    dataSource: dataSourceSchema.optional(),
  })
  .passthrough();

export type DataPointBase = z.infer<typeof dataPointBaseSchema>;

/** A data point includes the base envelope plus exactly one type-specific payload field. */
export const dataPointSchema = dataPointBaseSchema.and(z.record(z.string(), z.unknown()));

export type DataPoint<TPayload = unknown> = DataPointBase & Record<string, TPayload | unknown>;

/** Paginated `list`/`reconcile` response envelope. */
export const dataPointListResponseSchema = z
  .object({
    dataPoints: z.array(dataPointSchema).default([]),
    nextPageToken: z.string().optional(),
  })
  .passthrough();

export type DataPointListResponse<TPayload = unknown> = {
  dataPoints: Array<DataPoint<TPayload>>;
  nextPageToken?: string;
};

/** Rollup response envelope shared by `rollUp` and `dailyRollUp`. */
export const rollupResponseSchema = z
  .object({
    rollupDataPoints: z
      .array(z.record(z.string(), z.unknown()).and(z.object({}).passthrough()))
      .default([]),
  })
  .passthrough();

export type RollupResponse<TPayload = unknown> = {
  rollupDataPoints: Array<Record<string, TPayload | unknown>>;
};
