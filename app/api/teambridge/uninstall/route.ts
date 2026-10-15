import { handleTBUninstall } from '@/lib/teambridge';

/**
 * Teambridge calls this when an admin uninstalls the app from an account.
 * The app's client has already lost access to the account, so this is the
 * place to drop its state and stop any background work for it.
 */
export const POST = handleTBUninstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async ({ accountId }) => {
    // TODO: Clean up data for this account:
    //
    // await db.installations.delete({ where: { accountId } });

    console.log('[Teambridge] App uninstalled for account:', accountId);

    return { success: true };
  }
);
