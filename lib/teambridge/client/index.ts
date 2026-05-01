export { TBClient } from './TBClient';
export * from './types';

/**
 * Get a TBClient instance using OAuth2 credentials from environment variables.
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
    baseUrl: process.env.TB_OPEN_API_BASE_URL,
    authUrl: process.env.TB_AUTH_URL,
    audience: process.env.TB_AUDIENCE,
  });
}
