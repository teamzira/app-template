import { TBClient, TBApiError } from './TBClient';

export { TBClient, TBApiError };
export * from './types';

/**
 * What `getTBClient` needs from the request: the account it acts on and, for
 * user-scoped calls, the signed user context. `TBContext` from
 * `getTBContext()` has this shape, so it can be passed straight through.
 */
export interface TBClientScope {
  /** The account every request acts on. From `getTBContext()`. */
  accountId: string;
  /** Signed `X-User-Context` to act as the current user. Leave it out for the app's own access. */
  userContext?: string | null;
}

/**
 * A TBClient for one account, using the app's OAuth2 credentials from the
 * environment.
 *
 * One app client serves every account the app is installed on, so each
 * request names its account with `X-Account-Id`. Pass the context from
 * `getTBContext()`: with its `userContext`, reads and writes run as the
 * current user and Teambridge applies their permissions; with only
 * `accountId`, they run with the app's own access (schema resolution,
 * background work).
 *
 * @example
 * ```ts
 * import { getTBClient, getTBContext } from '@/lib/teambridge';
 *
 * export async function GET() {
 *   const ctx = await getTBContext();
 *   const client = getTBClient(ctx); // as the current user
 *   const records = await client.collections.records.list(collectionId, {
 *     page: 0,
 *     pageSize: 50,
 *   });
 *   return Response.json(records);
 * }
 * ```
 *
 * @example
 * ```ts
 * // Account structure, not user data: resolve with the app's own access.
 * const resolved = await resolveSchema(getTBClient({ accountId: ctx.accountId }), schema);
 * ```
 */
export function getTBClient(scope: TBClientScope) {
  const clientId = process.env.TB_CLIENT_ID;
  const clientSecret = process.env.TB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'TB_CLIENT_ID and TB_CLIENT_SECRET environment variables must be set'
    );
  }
  if (!scope?.accountId) {
    throw new Error(
      'getTBClient needs the account to act on. Pass the context from getTBContext(); ' +
        'in dev mode, set TB_DEV_ACCOUNT_ID to an account the app is installed on.'
    );
  }

  return new TBClient({
    clientId,
    clientSecret,
    accountId: scope.accountId,
    baseUrl: process.env.TB_OPEN_API_BASE_URL,
    authUrl: process.env.TB_AUTH_URL,
    audience: process.env.TB_AUDIENCE,
    userContext: scope.userContext ?? undefined,
  });
}
