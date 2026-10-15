import { handleTBInstall } from '@/lib/teambridge';

/**
 * Teambridge calls this when an admin installs the app on an account.
 *
 * It is advisory: the installation is active, and the app's one set of
 * credentials already covers the account, whether or not this succeeds. Keep
 * it fast and idempotent (an admin can resend it from the Dev Portal). Apps
 * installed before the hook existed never receive it, so an app that keeps
 * per-account state should also accept an account the first time the proxy
 * sends a request for it. See AGENTS.md → "Accounts".
 */
export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async ({ accountId, accountName }) => {
    // TODO: If the app keeps per-account state (settings, schema bindings,
    // background work), record the account here:
    //
    // await db.installations.upsert({ accountId, accountName });

    console.log('[Teambridge] App installed for account:', accountName ?? accountId, accountId);

    // Return `setupPath` to have Teambridge open the app at that app-local
    // path right after install, e.g. `{ success: true, setupPath: '/setup/' }`.
    return { success: true };
  }
);
