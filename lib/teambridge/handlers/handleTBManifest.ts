import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { manifestJson, type AppManifest } from '../manifest';
import { hasValidSignature, isTimestampTooOld } from './signature';

function hashOf(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/**
 * Content hash of an app manifest: the first 16 hex characters of the
 * SHA-256 of its JSON. Teambridge stores the hash of the manifest an account
 * was installed against and sends it back as `manifestVersion` on the install
 * webhook; `handleTBInstall` compares the two when given the manifest.
 */
export function manifestHash(manifest: AppManifest): string {
  return hashOf(manifestJson(manifest));
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
 *    The message names the purpose rather than the URL path: the app is
 *    served under `/apps/<slug>` behind the proxy and at `/` in dev, so a
 *    signed path would differ between the two for the same request.
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

  // The manifest is fixed for the life of the deployment, so build and hash
  // it once, on the first request. A spec problem (the same one `yarn
  // manifest` reports, so the build normally catches it) is kept too.
  let served: { body: string; etag: string } | { error: unknown } | undefined;
  const serve = () => {
    if (!served) {
      try {
        const body = manifestJson(manifest);
        served = { body, etag: `"${hashOf(body)}"` };
      } catch (error) {
        served = { error };
      }
    }
    return served;
  };

  return async function handler(request: Request) {
    if (process.env.TB_DEV_MODE !== 'true') {
      const timestamp = request.headers.get('x-tb-timestamp');
      const signature = request.headers.get('x-tb-signature');
      if (!webhookSecret) {
        console.error('[Teambridge] TB_WEBHOOK_SECRET is not set; refusing to serve the manifest unsigned.');
        return NextResponse.json({ error: 'Manifest signing is not configured' }, { status: 401 });
      }
      if (!timestamp || !signature) {
        return NextResponse.json({ error: 'Missing required headers' }, { status: 401 });
      }
      if (isTimestampTooOld(timestamp, maxRequestAge)) {
        return NextResponse.json({ error: 'Request too old' }, { status: 401 });
      }
      if (!hasValidSignature(webhookSecret, `${timestamp}.manifest`, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const result = serve();
    if ('error' in result) {
      console.error('[Teambridge] The app manifest is invalid:', result.error);
      return NextResponse.json({ error: 'The app manifest is invalid' }, { status: 500 });
    }

    const headers = { ETag: result.etag, 'Cache-Control': 'no-cache' };
    if (request.headers.get('if-none-match') === result.etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    return new NextResponse(result.body, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
  };
}
