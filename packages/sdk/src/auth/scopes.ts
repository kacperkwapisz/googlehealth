/**
 * OAuth scopes for the Google Health API. All scopes begin with the base
 * `https://www.googleapis.com/auth/googlehealth`. The write (read+write)
 * variant has no suffix; read-only ends in `.readonly`.
 *
 * @see https://developers.google.com/health/scopes
 */
export const GOOGLE_HEALTH_SCOPES = {
  activityAndFitness: "https://www.googleapis.com/auth/googlehealth.activity_and_fitness",
  activityAndFitnessReadonly:
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  healthMetrics: "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements",
  healthMetricsReadonly:
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  locationReadonly: "https://www.googleapis.com/auth/googlehealth.location.readonly",
  nutrition: "https://www.googleapis.com/auth/googlehealth.nutrition",
  nutritionReadonly: "https://www.googleapis.com/auth/googlehealth.nutrition.readonly",
  profile: "https://www.googleapis.com/auth/googlehealth.profile",
  profileReadonly: "https://www.googleapis.com/auth/googlehealth.profile.readonly",
  settings: "https://www.googleapis.com/auth/googlehealth.settings",
  settingsReadonly: "https://www.googleapis.com/auth/googlehealth.settings.readonly",
  sleep: "https://www.googleapis.com/auth/googlehealth.sleep",
  sleepReadonly: "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
} as const;

export type GoogleHealthScope = (typeof GOOGLE_HEALTH_SCOPES)[keyof typeof GOOGLE_HEALTH_SCOPES];

/** All read-only scopes (6 categories). Use for dashboards / exports / agents. */
export const DEFAULT_READ_SCOPES: readonly GoogleHealthScope[] = [
  GOOGLE_HEALTH_SCOPES.profileReadonly,
  GOOGLE_HEALTH_SCOPES.settingsReadonly,
  GOOGLE_HEALTH_SCOPES.activityAndFitnessReadonly,
  GOOGLE_HEALTH_SCOPES.healthMetricsReadonly,
  GOOGLE_HEALTH_SCOPES.sleepReadonly,
  GOOGLE_HEALTH_SCOPES.nutritionReadonly,
];

/** Read+write scopes for all six categories. */
export const DEFAULT_WRITE_SCOPES: readonly GoogleHealthScope[] = [
  GOOGLE_HEALTH_SCOPES.profile,
  GOOGLE_HEALTH_SCOPES.settings,
  GOOGLE_HEALTH_SCOPES.activityAndFitness,
  GOOGLE_HEALTH_SCOPES.healthMetrics,
  GOOGLE_HEALTH_SCOPES.sleep,
  GOOGLE_HEALTH_SCOPES.nutrition,
];
