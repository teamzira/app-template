import { configStore, handleTBUninstall } from '@/lib/teambridge';
import { invalidateSchema } from '@/lib/teambridge/schema';

/**
 * Teambridge calls this when an admin uninstalls the app from an account.
 * The app's client has already lost access to the account, so this is the
 * place to drop its state and stop any background work for it. Idempotent:
 * deleting what isn't there is fine.
 */
export const POST = handleTBUninstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async ({ accountId }) => {
    await configStore.delete(accountId);
    invalidateSchema(accountId);

    console.log('[Teambridge] App uninstalled for account:', accountId);

    return { success: true };
  }
);
