import { NextResponse } from 'next/server';
import { hasValidSignature } from './signature';
import { manifestHash } from './handleTBManifest';
import type {
  TBInstallHandlerConfig,
  TBInstallPayload,
  TBInstallContext,
} from '../types';

/**
 * Creates a handler for the Teambridge install webhook.
 *
 * This handler validates the webhook signature and calls your callback
 * with the installation context (accountId, apiToken, apiBaseUrl).
 *
 * @example
 * ```ts
 * // app/api/teambridge/install/route.ts
 * import { handleTBInstall } from '@/lib/teambridge';
 *
 * export const POST = handleTBInstall(
 *   { webhookSecret: process.env.TB_WEBHOOK_SECRET! },
 *   async (context) => {
 *     // Store the API token for this account
 *     await db.appInstallations.create({
 *       accountId: context.accountId,
 *       apiToken: context.apiToken,
 *     });
 *
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function handleTBInstall(
  config: TBInstallHandlerConfig,
  callback: (
    context: TBInstallContext
  ) => Promise<{ success: boolean; error?: string }>
) {
  // Hashed once, on the first install that needs it.
  let currentManifestHash: string | undefined;

  return async function handler(request: Request) {
    try {
      const timestamp = request.headers.get('x-tb-timestamp');
      const signature = request.headers.get('x-tb-signature');

      if (!timestamp || !signature) {
        return NextResponse.json(
          { success: false, error: 'Missing required headers' },
          { status: 401 }
        );
      }

      const bodyText = await request.text();

      // Validate signature
      if (
        !hasValidSignature(config.webhookSecret, `${timestamp}.${bodyText}`, signature)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }

      const payload: TBInstallPayload = JSON.parse(bodyText);

      // Validate required fields
      if (!payload.accountId || !payload.apiToken) {
        return NextResponse.json(
          { success: false, error: 'Invalid payload' },
          { status: 400 }
        );
      }

      // Call the user's callback
      const result = await callback({
        accountId: payload.accountId,
        apiToken: payload.apiToken,
        apiBaseUrl: payload.apiBaseUrl,
        manifestVersion: payload.manifestVersion,
        manifestOutdated:
          config.manifest && payload.manifestVersion
            ? payload.manifestVersion !== (currentManifestHash ??= manifestHash(config.manifest))
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
