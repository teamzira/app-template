import { getTBClient, handleTBInstall, resolveAccountSchema, settingsEnabled, SETUP_PATH } from '@/lib/teambridge';
import { invalidateSchema } from '@/lib/teambridge/schema';
import { schema } from '@/app/schema';

/**
 * Teambridge calls this when an admin installs the app on an account.
 *
 * It is advisory: the installation is active, and the app's one set of
 * credentials already covers the account, whether or not this succeeds. Keep
 * it fast and idempotent (an admin can resend it from the Dev Portal). Apps
 * installed before the hook existed never receive it, so nothing here may be
 * the only way an account gets working: the setup gate (`requireSetup`) in
 * every page covers accounts that never got the hook.
 *
 * Returning `setupPath` makes Teambridge open the app at that path right
 * after install. Only do that when the account needs it. On first contact
 * `resolveAccountSchema` guesses the account's bindings by name and saves
 * them, so an account whose collections carry the expected names (or that
 * still has bindings from an earlier install) lands on the app itself; the
 * rest open setup with the obvious slots already filled. A deployment
 * without Settings (no database in production) never asks: there is no
 * setup page to open, and the app shows what's missing on the page itself.
 */
export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async ({ accountId, accountName }) => {
    console.log('[Teambridge] App installed for account:', accountName ?? accountId, accountId);

    // Look at the account as it is now, not as it was before a reinstall.
    invalidateSchema(accountId);
    try {
      // First contact guesses and saves bindings by name; see lib/teambridge/setup.ts.
      const resolved = await resolveAccountSchema(getTBClient({ accountId }), schema);
      return { success: true, setupPath: resolved.ready || !settingsEnabled() ? undefined : SETUP_PATH };
    } catch (e) {
      // Don't fail the install over a lookup. Send the installer to setup,
      // where the page reports what's wrong, if there is one.
      console.error('[Teambridge] Install: resolving the schema for', accountId, e);
      return { success: true, setupPath: settingsEnabled() ? SETUP_PATH : undefined };
    }
  }
);
