import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Checks a Teambridge webhook-style signature: the hex HMAC-SHA256 of
 * `message` with the app's webhook secret. Each handler decides what the
 * message is (`<timestamp>.<body>` for lifecycle webhooks,
 * `<timestamp>.manifest` for the manifest fetch).
 */
export function hasValidSignature(webhookSecret: string, message: string, signature: string): boolean {
  const expected = createHmac('sha256', webhookSecret).update(message).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    // Different lengths — not a match.
    return false;
  }
}

/** True when a unix-seconds `timestamp` is unparseable or further than `maxAgeSeconds` from now. */
export function isTimestampTooOld(timestamp: string, maxAgeSeconds: number): boolean {
  const sentAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sentAt)) return true;
  return Math.abs(Math.floor(Date.now() / 1000) - sentAt) > maxAgeSeconds;
}
