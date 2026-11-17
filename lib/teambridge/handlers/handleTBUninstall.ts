import { NextResponse } from 'next/server';
import type {
  TBHandlerConfig,
  TBUninstallPayload,
  TBUninstallContext,
  TBUninstallResult,
} from '../types';
import { verifyWebhook } from './webhook';

/**
 * Creates a handler for the Teambridge uninstall webhook.
 *
 * Teambridge sends it when an admin uninstalls the app from an account. By
 * then the app's client has lost access to that account, so any later call
 * for it fails with a 403 (`TBApiError.isNotInstalled`). Use the callback to
 * drop per-account state and stop background work for the account.
 *
 * @example
 * ```ts
 * // app/api/teambridge/uninstall/route.ts
 * import { handleTBUninstall } from '@/lib/teambridge';
 *
 * export const POST = handleTBUninstall(
 *   { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
 *   async ({ accountId }) => {
 *     await db.installations.delete({ where: { accountId } });
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function handleTBUninstall(
  config: TBHandlerConfig,
  callback: (context: TBUninstallContext) => Promise<TBUninstallResult>
) {
  return async function handler(request: Request) {
    try {
      const verified = await verifyWebhook<Partial<TBUninstallPayload>>(request, config);
      if (!verified.ok) return verified.response;

      const { accountId } = verified.payload;
      if (!accountId) {
        return NextResponse.json(
          { success: false, error: 'Invalid payload' },
          { status: 400 }
        );
      }

      const result = await callback({ accountId });

      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      });
    } catch (error) {
      console.error('[Teambridge] Uninstall handler error:', error);
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
