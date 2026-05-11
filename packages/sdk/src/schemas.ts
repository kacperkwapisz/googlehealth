/**
 * `googlehealth/schemas` subpath — zero-cost zod schemas without the runtime
 * client. Useful when you only need types + validation (RN apps, Next.js
 * Server Components, MCP servers, etc.) and don't want to pull in OAuth/fetch.
 */

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
