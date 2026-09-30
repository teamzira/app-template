import { handleTBInstall, manifestHash } from '@/lib/teambridge';
import manifest from '@/teambridge.manifest';

export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
  async (context) => {
    // TODO: Store the API token for this account
    // In production, save to your database:
    //
    // await db.appInstallations.create({
    //   accountId: context.accountId,
    //   apiToken: context.apiToken,
    //   apiBaseUrl: context.apiBaseUrl,
    // });

    console.log('[Teambridge] App installed for account:', context.accountId);

    // The account was set up for the manifest it was installed against. If
    // that's older than the app's current one, fields the app added since may
    // be missing there — the schema's setup notice will name them.
    if (context.manifestVersion && context.manifestVersion !== manifestHash(manifest)) {
      console.warn(
        `[Teambridge] Account ${context.accountId} was installed against manifest ${context.manifestVersion}; ` +
          `the app is on ${manifestHash(manifest)}.`
      );
    }
    console.log('[Teambridge] API Token received (store securely!)');

    return { success: true };
  }
);
