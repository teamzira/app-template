'use server';

import { getTBContext, TBClient, getCredentialsForAccount } from '@/lib/teambridge';

export async function createLocation(
  collectionId: string,
  data: Record<string, unknown>
): Promise<{ id?: string; error?: string }> {
  try {
    const { accountId, userContext } = await getTBContext();
    const credentials = getCredentialsForAccount(accountId);

    if (!credentials) {
      return { error: 'No credentials found for account' };
    }

    const client = new TBClient({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      baseUrl: process.env.TB_API_BASE_URL!,
      authUrl: process.env.TB_AUTH_URL!,
      audience: process.env.TB_AUDIENCE!,
      userContext,
    });

    const result = await client.collections.records.create(collectionId, data);
    return { id: result.id };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to create location' 
    };
  }
}
