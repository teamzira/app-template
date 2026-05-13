// Types
export type {
  TBContext,
  TBUser,
  TBHeaders,
  TBMiddlewareConfig,
  TBInstallPayload,
  TBUninstallPayload,
  TBHandlerConfig,
  TBInstallContext,
  TBUninstallContext,
} from './types';

// Middleware
export {
  tbMiddleware,
  getCredentialsForAccount,
} from './middleware';
export type { TBAccountCredentials } from './middleware';

// Context
export { TBProvider, useTBContext, getTBContext } from './context';

// Router (URL sync with parent iframe host)
export { TBRouter } from './router';

// Client
export { TBClient, getTBClient } from './client';
export type {
  TBClientConfig,
  PaginationOptions,
  PaginatedResponse,
  Collection,
  Field,
  DataRecord,
  Shift,
  CreateShiftRequest,
  ShiftTimestamp,
  Placement,
  CreatePlacementRequest,
  User,
  CreateUserRequest,
  UserLookupQuery,
  Job,
  CreateJobRequest,
  Location,
  Timezone,
  Document,
  DocumentUploadOptions,
} from './client';

// Handlers
export { handleTBInstall, handleTBUninstall } from './handlers';

// URL + fetch helpers. Routing primitives (`<Link>`, `useRouter`, `redirect`,
// `usePathname`) all handle the /apps/<slug> prefix natively via Next.js's
// `basePath` config — apps should import them from `next/link` and
// `next/navigation` directly. Native `fetch` is the one exception, since it
// doesn't honor basePath; use `tbFetch` for same-origin requests.
export { tbPath, TB_APP_BASE_PATH } from './url';
export { tbFetch } from './fetch';
