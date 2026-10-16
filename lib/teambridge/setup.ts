import { redirect } from 'next/navigation';
import type { TBClient } from './client/TBClient';
import { configStore } from './config-store';
import {
  guessBindings,
  invalidateSchema,
  resolveSchema,
  type ResolvedSchema,
  type SchemaBindings,
  type SchemaSpec,
} from './schema';

/**
 * The setup gate: resolve the app's schema for an account with the account's
 * saved bindings, and send the user to the setup page while a required slot
 * is still unresolved.
 *
 * Installing an app makes it active at once, so a user can open it before an
 * admin has bound the app's slots to the account's collections and fields.
 * Pages call `requireSetup()` first:
 *
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   const start = resolved.collections.shifts.fields.start; // Field, never null when required
 *
 * It reasons from `resolved.issues`, not from whether the account has saved
 * anything: an account set up last month is sent back when the spec gains a
 * new required slot, for just that slot, and an account whose collections
 * carry the expected names (or whose slots are pinned in the spec) never
 * sees the setup page at all. Non-blocking issues (an optional slot not set
 * yet) don't redirect — show them with a `SetupNotice` and degrade.
 *
 * The setup page itself, API routes and the lifecycle hooks don't call it;
 * they use `resolveAccountSchema()` to look without redirecting.
 */

/** App-local path of the setup page. The install hook returns it as `setupPath`. */
export const SETUP_PATH = '/setup/';

/**
 * Resolve `spec` for the client's account, applying the bindings saved for
 * that account. Same caching as `resolveSchema`. Use the app's own access
 * (`getTBClient({ accountId })`): the schema is account structure, not user
 * data.
 *
 * On first contact with an account — no config saved yet, which is the
 * install hook's call or, for an account the hook never reached, its first
 * request — it initializes the account first (see `initializeAccount`).
 */
export async function resolveAccountSchema<S extends SchemaSpec>(
  client: TBClient,
  spec: S
): Promise<ResolvedSchema<S>> {
  if (!client.accountId) {
    throw new Error(
      'resolveAccountSchema needs a client that names its account. Build it with getTBClient({ accountId }).'
    );
  }
  const config = await configStore.get(client.accountId);
  const bindings = config ? config.bindings : await initializeAccount(client, spec);
  return resolveSchema(client, spec, { bindings });
}

/**
 * First contact with an account: make the good-faith guess at its bindings
 * by name (`guessBindings`) and save it, so an account whose collections
 * carry the expected names works at once and the rest start setup with the
 * obvious slots filled. Idempotent: the same account guesses the same way,
 * and once a config exists it is never guessed over — an admin's choices in
 * Settings, including "Not used", stay. Returns what was saved.
 */
export async function initializeAccount<S extends SchemaSpec>(client: TBClient, spec: S): Promise<SchemaBindings> {
  const accountId = client.accountId;
  if (!accountId) throw new Error('initializeAccount needs a client that names its account.');
  const bindings = await guessBindings(client, spec);
  await configStore.set(accountId, { bindings, updatedAt: new Date().toISOString() });
  invalidateSchema(accountId);
  return bindings;
}

/**
 * `resolveAccountSchema`, plus the redirect: when a required collection or
 * field is unresolved (`resolved.ready === false`) the user is sent to the
 * setup page instead of a page that can't work.
 *
 * `redirect()` works by throwing, so call this outside any `try`, or start the
 * `catch` with `unstable_rethrow(e)` from `next/navigation` (the demo page
 * does) — a `catch` that maps every error to a message would turn the
 * redirect into an error alert.
 */
export async function requireSetup<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  options: { setupPath?: string } = {}
): Promise<ResolvedSchema<S>> {
  const resolved = await resolveAccountSchema(client, spec);
  if (!resolved.ready) redirect(options.setupPath ?? SETUP_PATH);
  return resolved;
}
