import { handleTBInstall } from '@/lib/teambridge';
import manifest from '@/teambridge.manifest';

export const POST = handleTBInstall(
  { webhookSecret: process.env.TB_WEBHOOK_SECRET!, manifest },
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

    // Fields the app added since this account's manifest may be missing
    // there — the schema's setup notice will name them.
    if (context.manifestOutdated) {
      console.warn(
        `[Teambridge] Account ${context.accountId} was installed against an older manifest (${context.manifestVersion}).`
      );
    }
    console.log('[Teambridge] API Token received (store securely!)');

    return { success: true };
  }
);
