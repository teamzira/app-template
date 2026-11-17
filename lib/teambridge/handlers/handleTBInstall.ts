import { NextResponse } from 'next/server';
import type {
  TBHandlerConfig,
  TBInstallPayload,
  TBInstallContext,
  TBInstallResult,
} from '../types';
import { verifyWebhook } from './webhook';

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
  config: TBHandlerConfig,
  callback: (context: TBInstallContext) => Promise<TBInstallResult>
) {
  return async function handler(request: Request) {
    try {
      const verified = await verifyWebhook<Partial<TBInstallPayload>>(request, config);
      if (!verified.ok) return verified.response;

      const { accountId, accountName } = verified.payload;
      if (!accountId) {
        return NextResponse.json(
          { success: false, error: 'Invalid payload' },
          { status: 400 }
        );
      }

      const result = await callback({
        accountId,
        accountName: typeof accountName === 'string' ? accountName : undefined,
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
