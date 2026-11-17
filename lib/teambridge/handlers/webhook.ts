import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import type { TBHandlerConfig } from '../types';

const DEFAULT_MAX_REQUEST_AGE = 300;

/**
 * Lifecycle webhooks (install, uninstall) are signed with the app's webhook
 * secret, the same secret the proxy uses for `X-TB-Signature` on page
 * requests. The two sign different things: the proxy signs the request path,
 * a webhook signs its body. Here `X-TB-Signature` is the hex HMAC-SHA256 of
 * `{X-TB-Timestamp}.{raw body}`. The body is JSON:
 * `{ event: 'installed' | 'uninstalled', accountId, accountName?, timestamp }`.
 *
 * Teambridge posts them to `/api/teambridge/install/` and
 * `/api/teambridge/uninstall/` under the app's base URL, trailing slash
 * included: `trailingSlash: true` in `next.config.ts` answers the slash-less
 * form with a 308, which never reaches the handler.
 */
function validateWebhookSignature(
  webhookSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const message = `${timestamp}.${body}`;
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(message)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/** Replay protection: `timestamp` is Unix seconds, as on proxied requests. */
function isRequestTooOld(timestamp: string, maxAge: number): boolean {
  const requestTime = Number.parseInt(timestamp, 10);
  if (Number.isNaN(requestTime)) return true;
  const now = Math.floor(Date.now() / 1000);
  return now - requestTime > maxAge;
}

export type VerifiedWebhook<T> =
  | { ok: true; payload: T }
  | { ok: false; response: NextResponse };

function refuse(status: number, error: string): VerifiedWebhook<never> {
  return { ok: false, response: NextResponse.json({ success: false, error }, { status }) };
}

/**
 * Reads and verifies a lifecycle webhook: required headers, age, signature,
 * JSON body. On failure, carries the response to return.
 */
export async function verifyWebhook<T>(
  request: Request,
  config: TBHandlerConfig
): Promise<VerifiedWebhook<T>> {
  const timestamp = request.headers.get('x-tb-timestamp');
  const signature = request.headers.get('x-tb-signature');

  if (!timestamp || !signature) {
    return refuse(401, 'Missing required headers');
  }
  if (isRequestTooOld(timestamp, config.maxRequestAge ?? DEFAULT_MAX_REQUEST_AGE)) {
    return refuse(401, 'Request too old');
  }

  const bodyText = await request.text();
  if (!validateWebhookSignature(config.webhookSecret, timestamp, bodyText, signature)) {
    return refuse(401, 'Invalid signature');
  }

  try {
    return { ok: true, payload: JSON.parse(bodyText) as T };
  } catch {
    return refuse(400, 'Invalid payload');
  }
}
