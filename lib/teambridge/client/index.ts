export { TBClient } from './TBClient';
export * from './types';

/**
 * Get a TBClient instance using OAuth2 credentials from environment variables.
 *
 * Required environment variables:
 * - TB_CLIENT_ID: OAuth2 Client ID
 * - TB_CLIENT_SECRET: OAuth2 Client Secret
 *
 * Optional environment variables:
 * - TB_API_BASE_URL: API base URL (defaults to https://api.teambridge.com)
 * - TB_AUTH_URL: Auth0 token endpoint (defaults to https://teambridge.us.auth0.com/oauth/token)
 * - TB_AUDIENCE: OAuth2 audience (defaults to API base URL)
 *
 * @example
 * ```ts
 * import { getTBClient } from '@/lib/teambridge';
 *
 * const client = getTBClient();
 * const shifts = await client.shifts.list();
 * ```
 */
export function getTBClient() {
  const clientId = process.env.TB_CLIENT_ID;
  const clientSecret = process.env.TB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'TB_CLIENT_ID and TB_CLIENT_SECRET environment variables must be set'
    );
  }

  const { TBClient } = require('./TBClient');
  return new TBClient({
    clientId,
    clientSecret,
    baseUrl: process.env.TB_API_BASE_URL,
    authUrl: process.env.TB_AUTH_URL,
    audience: process.env.TB_AUDIENCE,
  });
}
