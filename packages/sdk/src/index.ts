export const VERSION = "0.0.1";

export {
  type BatchDeleteRequest,
  type CivilTimestamp,
  type DailyRollUpRequest,
  DataPointsApi,
  type ListOptions,
  type ReconcileOptions,
  type RollUpRequest,
} from "./api/data-points.ts";
export { buildTimeFilter, type TimeInput } from "./api/filters.ts";
export { type Identity, IdentityApi } from "./api/identity.ts";
export { type Profile, ProfileApi } from "./api/profile.ts";
export { type Settings, SettingsApi } from "./api/settings.ts";
export {
  type ListSubscribersOptions,
  type PatchSubscriberOptions,
  type Subscriber,
  type SubscriberListResponse,
  SubscribersApi,
} from "./api/subscribers.ts";
export { TcxApi } from "./api/tcx.ts";
export {
  type AuthorizationUrlOptions,
  buildAuthorizationUrl,
  createOAuthProvider,
  type ExchangeCodeOptions,
  exchangeCode,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  type RefreshTokenOptions,
  refreshTokens,
} from "./auth/oauth.ts";
export { generatePkce, type PkcePair, randomState } from "./auth/pkce.ts";
export {
  type AuthProvider,
  type RefreshFn,
  RefreshingTokenAuth,
  StaticTokenAuth,
} from "./auth/provider.ts";
export {
  DEFAULT_READ_SCOPES,
  DEFAULT_WRITE_SCOPES,
  GOOGLE_HEALTH_SCOPES,
  type GoogleHealthScope,
} from "./auth/scopes.ts";
export { isExpired, MemoryTokenStore, type TokenSet, type TokenStore } from "./auth/tokens.ts";
export { GoogleHealth, type GoogleHealthOptions } from "./client.ts";
export {
  AuthError,
  type ErrorCode,
  GoogleHealthError,
  type GoogleHealthErrorInit,
  HttpError,
  NetworkError,
  RateLimitError,
  statusToCode,
} from "./errors.ts";
export {
  DEFAULT_BASE_URL,
  DEFAULT_USER_AGENT,
  HttpClient,
  type HttpClientOptions,
  type Query,
  type QueryValue,
  type RequestOptions,
} from "./http.ts";
export {
  type CivilTime,
  civilTimeSchema,
  type DataSource,
  type DateValue,
  dataSourceSchema,
  dateSchema,
  type IntervalValue,
  intervalSchema,
  type SampleTime,
  sampleTimeSchema,
  type TimeOfDay,
  timeOfDaySchema,
} from "./types/common.ts";
export {
  type DataPoint,
  type DataPointBase,
  type DataPointListResponse,
  dataPointBaseSchema,
  dataPointListResponseSchema,
  dataPointSchema,
  type RollupResponse,
  rollupResponseSchema,
} from "./types/data-point.ts";
export {
  DATA_SCOPES,
  DATA_TYPE_NAMES,
  DATA_TYPES,
  type DataPointOperation,
  type DataScope,
  type DataTypeMeta,
  type DataTypeName,
  dataTypeNameSchema,
  getDataType,
  listDataTypes,
  OPERATIONS,
  RECORD_TYPES,
  type RecordType,
  scopeFor,
  supports,
} from "./types/data-types.ts";
