import type { AppManifest } from './manifest';

/**
 * Context extracted from Teambridge proxy headers
 */
export interface TBContext {
  /** UUID of the current account */
  accountId: string;
  /** UUID of the requesting user */
  userId: string;
  /** Current user information */
  user: TBUser;
  /** Signed X-User-Context header value to forward to the Open API */
  userContext?: string;
}

/**
 * User information from Teambridge headers
 */
export interface TBUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Headers sent by Teambridge proxy
 */
export interface TBHeaders {
  'x-tb-account-id': string;
  'x-tb-user-id': string;
  'x-tb-user-email': string;
  'x-tb-user-name': string;
  'x-tb-timestamp': string;
  'x-tb-signature': string;
}

/**
 * Middleware configuration options
 */
export interface TBMiddlewareConfig {
  /** Webhook secret for HMAC signature validation */
  webhookSecret: string;
  /** Maximum age of request in seconds (default: 300) */
  maxRequestAge?: number;
}

/**
 * Install webhook payload from Teambridge, sent when an admin installs the
 * app on an account. There is no per-account token: the app's one set of
 * credentials covers every account it is installed on, and installing is
 * what grants the account.
 */
export interface TBInstallPayload {
  /** UUID of the account the app was installed on */
  accountId: string;
  /** The account's display name, for logs and setup copy. */
  accountName?: string;
  /**
   * Hash of the app manifest the admin reviewed for this account (the
   * manifest route's ETag, without quotes). Sent when the install, or a
   * re-review of an installed app's setup, went through a manifest; absent
   * otherwise. Compare with `manifestHash(manifest)` to tell an account that
   * is behind the app's current manifest.
   */
  manifestVersion?: string;
}

/**
 * Uninstall webhook payload from Teambridge
 */
export interface TBUninstallPayload {
  /** UUID of the account the app was uninstalled from */
  accountId: string;
}

/**
 * Handler configuration for lifecycle webhooks
 */
export interface TBHandlerConfig {
  /** Webhook secret for HMAC signature validation */
  webhookSecret: string;
  /** Maximum age of a webhook in seconds (default: 300) */
  maxRequestAge?: number;
}

/**
 * Install handler configuration
 */
export interface TBInstallHandlerConfig extends TBHandlerConfig {
  /**
   * The app's install manifest (`teambridge.manifest.ts`). When given, the
   * handler compares it with the manifest the account was installed against
   * and sets `manifestOutdated` on the context.
   */
  manifest?: AppManifest;
}

/**
 * Install handler context passed to the callback
 */
export type TBInstallContext = TBInstallPayload & {
  /**
   * True when the account was installed against an older manifest than the
   * app's current one, so fields added since may be missing there. Undefined
   * when either side is unknown (no `manifest` in the config, or Teambridge
   * didn't send `manifestVersion`).
   */
  manifestOutdated?: boolean;
};

/**
 * What the install callback returns. The webhook is advisory: the
 * installation is active whatever this says. `setupPath` asks Teambridge to
 * open the app at that app-local path (for example `/setup/`) right after
 * install, for apps the installer has to configure first.
 */
export interface TBInstallResult {
  success: boolean;
  error?: string;
  setupPath?: string;
}

/**
 * Uninstall handler context passed to the callback
 */
export type TBUninstallContext = TBUninstallPayload;

/**
 * What the uninstall callback returns.
 */
export interface TBUninstallResult {
  success: boolean;
  error?: string;
}
