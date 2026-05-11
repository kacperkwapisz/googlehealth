import { z } from "zod";

/** Calendar date in the Google API conventional shape. */
export const dateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

/** Time of day; Google omits fields that are zero, so all are optional. */
export const timeOfDaySchema = z
  .object({
    hours: z.number().int().min(0).max(23).optional(),
    minutes: z.number().int().min(0).max(59).optional(),
    seconds: z.number().int().min(0).max(60).optional(),
    nanos: z.number().int().optional(),
  })
  .passthrough();

/** Civil time: date + time without timezone (wall-clock). */
export const civilTimeSchema = z.object({
  date: dateSchema,
  time: timeOfDaySchema,
});

/** Time interval (used by Interval data types). */
export const intervalSchema = z
  .object({
    startTime: z.string(),
    endTime: z.string(),
    startUtcOffset: z.string().optional(),
    endUtcOffset: z.string().optional(),
    civilStartTime: civilTimeSchema.optional(),
    civilEndTime: civilTimeSchema.optional(),
  })
  .passthrough();

/** Sample time (used by Sample data types). */
export const sampleTimeSchema = z
  .object({
    physicalTime: z.string(),
    utcOffset: z.string().optional(),
    civilTime: civilTimeSchema.optional(),
  })
  .passthrough();

/** Where the data point came from (device, app, platform). */
export const dataSourceSchema = z
  .object({
    recordingMethod: z.string().optional(),
    device: z
      .object({
        manufacturer: z.string().optional(),
        displayName: z.string().optional(),
        formFactor: z.string().optional(),
      })
      .passthrough()
      .optional(),
    application: z
      .object({
        packageName: z.string().optional(),
        webClientId: z.string().optional(),
        googleWebClientId: z.string().optional(),
      })
      .passthrough()
      .optional(),
    platform: z.string().optional(),
  })
  .passthrough();

export type DateValue = z.infer<typeof dateSchema>;
export type TimeOfDay = z.infer<typeof timeOfDaySchema>;
export type CivilTime = z.infer<typeof civilTimeSchema>;
export type IntervalValue = z.infer<typeof intervalSchema>;
export type SampleTime = z.infer<typeof sampleTimeSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
