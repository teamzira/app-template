import {
  getTBClient,
  handleTBInstall,
  recordTeambridgeSetup,
  resolveAccountSchema,
  settingsEnabled,
  setupPathFor,
  SETUP_PATH,
} from '@/lib/teambridge';
import { schema } from '@/app/schema';
import manifest from '@/teambridge.manifest';

/**
 * Teambridge calls this when an admin installs the app on an account, and
 * again when an admin re-reviews an installed app's setup in the App Library.
 * Either way the account's bindings in Teambridge may have changed, so it
 * records the review (with the manifest version it went through) and drops
 * the account's cached schema before resolving it again.
 *
 * It is advisory: the installation is active, and the app's one set of
 * credentials already covers the account, whether or not this succeeds. Keep
 * it fast and idempotent (an admin can resend it from the Dev Portal). Apps
 * installed before the hook existed never receive it, so nothing here may be
 * the only way an account gets working: the setup gate (`requireSetup`) in
 * every page covers accounts that never got the hook.
 *
 * Returning `setupPath` makes Teambridge open the app at that path right
 * after install. Only do that when the account needs it (`setupPathFor`).
 * The admin has usually just mapped every requirement in Teambridge, so the
 * app opens on itself. For the rest, `resolveAccountSchema` guesses unset
 * slots by name on first contact and saves them; an account still missing a
 * required slot opens setup, which links back to Teambridge's App Library
 * when Teambridge holds the account's bindings. A deployment without Settings
 * (no database in production) and no bindings in Teambridge never asks:
 * there is no setup to open.
 */
export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET!, manifest },
  async ({ accountId, accountName, manifestVersion, manifestOutdated }) => {
    console.log('[Teambridge] App installed for account:', accountName ?? accountId, accountId);
    // Fields the app added since this account's manifest may be missing
    // there — the schema's setup notice will name them.
    if (manifestOutdated) {
      console.warn(
        `[Teambridge] Account ${accountId} was installed against an older manifest (${manifestVersion}).`
      );
    }

    try {
      // Look at the account as it is now, not as it was before this review.
      await recordTeambridgeSetup(accountId, manifestVersion);
      // Teambridge's bindings first; first contact guesses and saves the rest by name. See lib/teambridge/setup.ts.
      const resolved = await resolveAccountSchema(getTBClient({ accountId }), schema);
      return { success: true, setupPath: setupPathFor(resolved) };
    } catch (e) {
      // Don't fail the install over a lookup. Send the installer to setup,
      // where the page reports what's wrong, if there is one.
      console.error('[Teambridge] Install: resolving the schema for', accountId, e);
      return { success: true, setupPath: settingsEnabled() ? SETUP_PATH : undefined };
    }
  }
);
