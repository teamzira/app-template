import { NextResponse } from 'next/server';
import type {
  TBInstallHandlerConfig,
  TBInstallPayload,
  TBInstallContext,
  TBInstallResult,
} from '../types';
import { verifyWebhook } from './webhook';
import { manifestHash } from './handleTBManifest';

/**
 * Creates a handler for the Teambridge install webhook.
 *
 * Teambridge sends it when an admin installs the app on an account. It is
 * advisory: the installation is active, and the app's credentials already
 * cover the account, whatever this returns. So keep the callback fast and
 * idempotent (an admin can resend the hook from the Dev Portal), and use it
 * to record the account when the app keeps per-account state.
 *
 * Return `setupPath` to have Teambridge open the app at that app-local path
 * right after install, for apps the installer has to configure first.
 *
 * Teambridge sends it again when an admin re-reviews an installed app's setup
 * in the App Library, so it is also where the app learns that the account's
 * bindings changed. When the install reviewed a manifest, the payload carries
 * its version (`manifestVersion`); pass the app's `manifest` in the config to
 * have `manifestOutdated` set on the context.
 *
 * @example
 * ```ts
 * // app/api/teambridge/install/route.ts
 * import { handleTBInstall } from '@/lib/teambridge';
 *
 * export const POST = handleTBInstall(
 *   { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
 *   async ({ accountId, accountName }) => {
 *     await db.installations.upsert({ accountId, accountName });
 *     return { success: true, setupPath: '/setup/' };
 *   }
 * );
 * ```
 */
export function handleTBInstall(
  config: TBInstallHandlerConfig,
  callback: (context: TBInstallContext) => Promise<TBInstallResult>
) {
  // Hashed once, on the first install that needs it.
  let currentManifestHash: string | undefined;

  return async function handler(request: Request) {
    try {
      const verified = await verifyWebhook<Partial<TBInstallPayload>>(request, config);
      if (!verified.ok) return verified.response;

      const { accountId, accountName, manifestVersion: rawVersion } = verified.payload;
      if (!accountId) {
        return NextResponse.json(
          { success: false, error: 'Invalid payload' },
          { status: 400 }
        );
      }

      const manifestVersion = typeof rawVersion === 'string' && rawVersion ? rawVersion : undefined;
      const result = await callback({
        accountId,
        accountName: typeof accountName === 'string' ? accountName : undefined,
        manifestVersion,
        manifestOutdated:
          config.manifest && manifestVersion
            ? manifestVersion !== (currentManifestHash ??= manifestHash(config.manifest))
            : undefined,
      });

      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      });
    } catch (error) {
      console.error('[Teambridge] Install handler error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  };
}
