import { NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { manifestJson, type AppManifest } from '../manifest';

/**
 * Content hash of an app manifest: the first 16 hex characters of the
 * SHA-256 of its JSON. Teambridge stores the hash of the manifest an account
 * was installed against and sends it back as `manifestVersion` on the install
 * webhook, so the app can tell when an account is behind its current manifest.
 */
export function manifestHash(manifest: AppManifest): string {
  return createHash('sha256').update(manifestJson(manifest)).digest('hex').slice(0, 16);
}

/**
 * The message Teambridge signs when it fetches the manifest. It names the
 * purpose rather than the URL path: the app is served under `/apps/<slug>`
 * behind the proxy and at `/` in dev, so a signed path would differ between
 * the two for the same request.
 */
function signedMessage(timestamp: string): string {
  return `${timestamp}.manifest`;
}

function validSignature(webhookSecret: string, timestamp: string, signature: string): boolean {
  const expected = createHmac('sha256', webhookSecret).update(signedMessage(timestamp)).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function isTooOld(timestamp: string, maxAgeSeconds: number): boolean {
  const sentAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sentAt)) return true;
  return Math.abs(Math.floor(Date.now() / 1000) - sentAt) > maxAgeSeconds;
}

interface TBManifestHandlerConfig {
  /** The app's webhook secret — the same one the install webhook is signed with. */
  webhookSecret: string | undefined;
  /** Maximum age of a signed request, in seconds (default 300). */
  maxRequestAge?: number;
}

/**
 * Serves the app's install manifest so Teambridge can read it when the app
 * is registered or updated, instead of someone pasting it in.
 *
 * Contract (what the Teambridge side implements):
 *  - `GET <app base URL>/api/teambridge/manifest`
 *  - Headers `X-TB-Timestamp` (unix seconds) and `X-TB-Signature`: the hex
 *    HMAC-SHA256 of `"<timestamp>.manifest"` with the app's webhook secret.
 *  - 200 with the manifest JSON (byte-identical to `teambridge.manifest.json`)
 *    and `ETag: "<manifestHash>"`; 304 when `If-None-Match` carries that ETag.
 *
 * In dev mode (`TB_DEV_MODE=true`) the signature is not required, so the
 * manifest can be fetched with curl and pasted into the install lab.
 *
 * @example
 *   // app/api/teambridge/manifest/route.ts
 *   import manifest from '@/teambridge.manifest';
 *   export const GET = handleTBManifest({ webhookSecret: process.env.TB_WEBHOOK_SECRET }, manifest);
 */
export function handleTBManifest(config: TBManifestHandlerConfig, manifest: AppManifest) {
  const { webhookSecret, maxRequestAge = 300 } = config;

  return async function handler(request: Request) {
    const isDevMode = process.env.TB_DEV_MODE === 'true';

    if (!isDevMode) {
      const timestamp = request.headers.get('x-tb-timestamp');
      const signature = request.headers.get('x-tb-signature');
      if (!webhookSecret) {
        console.error('[Teambridge] TB_WEBHOOK_SECRET is not set; refusing to serve the manifest unsigned.');
        return NextResponse.json({ error: 'Manifest signing is not configured' }, { status: 401 });
      }
      if (!timestamp || !signature) {
        return NextResponse.json({ error: 'Missing required headers' }, { status: 401 });
      }
      if (isTooOld(timestamp, maxRequestAge)) {
        return NextResponse.json({ error: 'Request too old' }, { status: 401 });
      }
      if (!validSignature(webhookSecret, timestamp, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    let body: string;
    let etag: string;
    try {
      body = manifestJson(manifest);
      etag = `"${manifestHash(manifest)}"`;
    } catch (error) {
      // A spec problem — the same one `yarn manifest` reports, so the build
      // normally catches it first.
      console.error('[Teambridge] The app manifest is invalid:', error);
      return NextResponse.json({ error: 'The app manifest is invalid' }, { status: 500 });
    }

    const headers = { ETag: etag, 'Cache-Control': 'no-cache' };
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    return new NextResponse(body, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
  };
}
