import { z } from "zod";

/**
 * The four record shapes Google uses for data points:
 * - `sample`: a single observation at a point in time (e.g. heart rate, weight)
 * - `interval`: a measurement over a span of time (e.g. steps, distance)
 * - `daily`: an aggregate covering a calendar day (e.g. daily RHR)
 * - `session`: a structured event with a start/end (e.g. sleep, exercise)
 *
 * @see https://developers.google.com/health/data-types
 */
export const RECORD_TYPES = ["sample", "interval", "daily", "session"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

/** OAuth scope category. Each data type belongs to exactly one. */
export const DATA_SCOPES = [
  "activity_and_fitness",
  "health_metrics_and_measurements",
  "sleep",
  "nutrition",
] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

export const OPERATIONS = [
  "list",
  "get",
  "reconcile",
  "rollUp",
  "dailyRollUp",
  "create",
  "update",
  "batchDelete",
] as const;
export type DataPointOperation = (typeof OPERATIONS)[number];

export interface DataTypeMeta {
  /** Kebab-case identifier used in URLs (e.g. "heart-rate"). */
  name: string;
  /** snake_case identifier used in filter parameters (e.g. "heart_rate"). */
  snakeName: string;
  /** camelCase JSON field that holds the type-specific payload on each data point. */
  field: string;
  record: RecordType;
  scope: DataScope;
  operations: readonly DataPointOperation[];
  webhook: boolean;
}

/**
 * Registry of every Google Health API v4 data type. Designed to be additive —
 * Q2 2026 will add Goals, Lifetime Stats, ECG, Blood Glucose, Body Temperature
 * and Food Logs; each lands as one additional entry below.
 */
export const DATA_TYPES = {
  "active-minutes": {
    name: "active-minutes",
    snakeName: "active_minutes",
    field: "activeMinutes",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["reconcile", "rollUp", "dailyRollUp"],
    webhook: false,
  },
  "active-zone-minutes": {
    name: "active-zone-minutes",
    snakeName: "active_zone_minutes",
    field: "activeZoneMinutes",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  "activity-level": {
    name: "activity-level",
    snakeName: "activity_level",
    field: "activityLevel",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  altitude: {
    name: "altitude",
    snakeName: "altitude",
    field: "altitude",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  "body-fat": {
    name: "body-fat",
    snakeName: "body_fat",
    field: "bodyFat",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: [
      "list",
      "get",
      "reconcile",
      "rollUp",
      "dailyRollUp",
      "create",
      "update",
      "batchDelete",
    ],
    webhook: true,
  },
  "calories-in-heart-rate-zone": {
    name: "calories-in-heart-rate-zone",
    snakeName: "calories_in_heart_rate_zone",
    field: "caloriesInHeartRateZone",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["rollUp", "dailyRollUp"],
    webhook: true,
  },
  "daily-heart-rate-variability": {
    name: "daily-heart-rate-variability",
    snakeName: "daily_heart_rate_variability",
    field: "dailyHeartRateVariability",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: true,
  },
  "daily-heart-rate-zones": {
    name: "daily-heart-rate-zones",
    snakeName: "daily_heart_rate_zones",
    field: "dailyHeartRateZones",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["reconcile"],
    webhook: true,
  },
  "daily-oxygen-saturation": {
    name: "daily-oxygen-saturation",
    snakeName: "daily_oxygen_saturation",
    field: "dailyOxygenSaturation",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: true,
  },
  "daily-respiratory-rate": {
    name: "daily-respiratory-rate",
    snakeName: "daily_respiratory_rate",
    field: "dailyRespiratoryRate",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  "daily-resting-heart-rate": {
    name: "daily-resting-heart-rate",
    snakeName: "daily_resting_heart_rate",
    field: "dailyRestingHeartRate",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: true,
  },
  "daily-sleep-temperature-derivations": {
    name: "daily-sleep-temperature-derivations",
    snakeName: "daily_sleep_temperature_derivations",
    field: "dailySleepTemperatureDerivations",
    record: "daily",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: true,
  },
  "daily-vo2-max": {
    name: "daily-vo2-max",
    snakeName: "daily_vo2_max",
    field: "dailyVo2Max",
    record: "daily",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  distance: {
    name: "distance",
    snakeName: "distance",
    field: "distance",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  exercise: {
    name: "exercise",
    snakeName: "exercise",
    field: "exercise",
    record: "session",
    scope: "activity_and_fitness",
    operations: ["list", "get", "reconcile", "create", "update", "batchDelete"],
    webhook: true,
  },
  floors: {
    name: "floors",
    snakeName: "floors",
    field: "floors",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  "heart-rate": {
    name: "heart-rate",
    snakeName: "heart_rate",
    field: "heartRate",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  "heart-rate-variability": {
    name: "heart-rate-variability",
    snakeName: "heart_rate_variability",
    field: "heartRateVariability",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  height: {
    name: "height",
    snakeName: "height",
    field: "height",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: ["list", "get", "reconcile", "create", "update", "batchDelete"],
    webhook: false,
  },
  "hydration-log": {
    name: "hydration-log",
    snakeName: "hydration_log",
    field: "hydrationLog",
    record: "session",
    scope: "nutrition",
    operations: [
      "list",
      "get",
      "reconcile",
      "rollUp",
      "dailyRollUp",
      "create",
      "update",
      "batchDelete",
    ],
    webhook: false,
  },
  "oxygen-saturation": {
    name: "oxygen-saturation",
    snakeName: "oxygen_saturation",
    field: "oxygenSaturation",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  "respiratory-rate-sleep-summary": {
    name: "respiratory-rate-sleep-summary",
    snakeName: "respiratory_rate_sleep_summary",
    field: "respiratoryRateSleepSummary",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  "run-vo2-max": {
    name: "run-vo2-max",
    snakeName: "run_vo2_max",
    field: "runVo2Max",
    record: "sample",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: false,
  },
  "sedentary-period": {
    name: "sedentary-period",
    snakeName: "sedentary_period",
    field: "sedentaryPeriod",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: false,
  },
  sleep: {
    name: "sleep",
    snakeName: "sleep",
    field: "sleep",
    record: "session",
    scope: "sleep",
    operations: ["list", "get", "reconcile", "create", "update", "batchDelete"],
    webhook: true,
  },
  steps: {
    name: "steps",
    snakeName: "steps",
    field: "steps",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: true,
  },
  "swim-lengths-data": {
    name: "swim-lengths-data",
    snakeName: "swim_lengths_data",
    field: "swimLengthsData",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile", "rollUp", "dailyRollUp"],
    webhook: false,
  },
  "time-in-heart-rate-zone": {
    name: "time-in-heart-rate-zone",
    snakeName: "time_in_heart_rate_zone",
    field: "timeInHeartRateZone",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["reconcile", "rollUp", "dailyRollUp"],
    webhook: false,
  },
  "total-calories": {
    name: "total-calories",
    snakeName: "total_calories",
    field: "totalCalories",
    record: "interval",
    scope: "activity_and_fitness",
    operations: ["rollUp", "dailyRollUp"],
    webhook: true,
  },
  "vo2-max": {
    name: "vo2-max",
    snakeName: "vo2_max",
    field: "vo2Max",
    record: "sample",
    scope: "activity_and_fitness",
    operations: ["list", "reconcile"],
    webhook: false,
  },
  weight: {
    name: "weight",
    snakeName: "weight",
    field: "weight",
    record: "sample",
    scope: "health_metrics_and_measurements",
    operations: [
      "list",
      "get",
      "reconcile",
      "rollUp",
      "dailyRollUp",
      "create",
      "update",
      "batchDelete",
    ],
    webhook: true,
  },
} as const satisfies Record<string, DataTypeMeta>;

export type DataTypeName = keyof typeof DATA_TYPES;

export const DATA_TYPE_NAMES = Object.keys(DATA_TYPES) as readonly DataTypeName[];

/** Zod literal of every valid data type name. */
export const dataTypeNameSchema = z.enum(DATA_TYPE_NAMES as [DataTypeName, ...DataTypeName[]]);

export function getDataType(name: string): DataTypeMeta | undefined {
  return DATA_TYPES[name as DataTypeName];
}

export function listDataTypes(): readonly DataTypeMeta[] {
  return Object.values(DATA_TYPES);
}

export function supports(name: DataTypeName, op: DataPointOperation): boolean {
  return (DATA_TYPES[name].operations as readonly DataPointOperation[]).includes(op);
}

export function scopeFor(name: DataTypeName, write = false): string {
  const category = DATA_TYPES[name].scope;
  return `https://www.googleapis.com/auth/googlehealth.${category}${write ? "" : ".readonly"}`;
}
