/**
 * OAuth scopes for the Google Health API.
 *
 * Each Google Health data type belongs to one of four scope categories;
 * `read` lets you list/get/reconcile, `write` adds create/update/delete.
 *
 * @see https://developers.google.com/health/data-types
 */
export const GOOGLE_HEALTH_SCOPES = {
  activityAndFitnessRead: "https://www.googleapis.com/auth/health.activity_and_fitness.read",
  activityAndFitnessWrite: "https://www.googleapis.com/auth/health.activity_and_fitness.write",
  healthMetricsRead: "https://www.googleapis.com/auth/health.health_metrics_and_measurements.read",
  healthMetricsWrite:
    "https://www.googleapis.com/auth/health.health_metrics_and_measurements.write",
  sleepRead: "https://www.googleapis.com/auth/health.sleep.read",
  sleepWrite: "https://www.googleapis.com/auth/health.sleep.write",
  nutritionRead: "https://www.googleapis.com/auth/health.nutrition.read",
  nutritionWrite: "https://www.googleapis.com/auth/health.nutrition.write",
} as const;

export type GoogleHealthScope = (typeof GOOGLE_HEALTH_SCOPES)[keyof typeof GOOGLE_HEALTH_SCOPES];

/** All read scopes for the four Google Health data-type categories. */
export const DEFAULT_READ_SCOPES: readonly GoogleHealthScope[] = [
  GOOGLE_HEALTH_SCOPES.activityAndFitnessRead,
  GOOGLE_HEALTH_SCOPES.healthMetricsRead,
  GOOGLE_HEALTH_SCOPES.sleepRead,
  GOOGLE_HEALTH_SCOPES.nutritionRead,
];

/** Read + write scopes for all four categories. */
export const DEFAULT_WRITE_SCOPES: readonly GoogleHealthScope[] = [
  ...DEFAULT_READ_SCOPES,
  GOOGLE_HEALTH_SCOPES.activityAndFitnessWrite,
  GOOGLE_HEALTH_SCOPES.healthMetricsWrite,
  GOOGLE_HEALTH_SCOPES.sleepWrite,
  GOOGLE_HEALTH_SCOPES.nutritionWrite,
];
