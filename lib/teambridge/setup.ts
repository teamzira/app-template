import { redirect } from 'next/navigation';
import type { TBClient } from './client/TBClient';
import { configStore } from './config-store';
import {
  guessBindings,
  invalidateSchema,
  readAccountStructure,
  resolveByGuess,
  resolveSchema,
  type AccountStructure,
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
 *
 * A production deployment without a database can't save an admin's choices,
 * so it has no Settings page (`settingsEnabled`). There the gate returns the
 * unready schema instead of redirecting, and the page shows `SetupNotice`
 * (`components/setup-notice.tsx`) in place of its content.
 */

/** App-local path of the setup page. The install hook returns it as `setupPath`. */
export const SETUP_PATH = '/setup/';

/**
 * Whether this deployment has a Settings page: true when the config store
 * keeps data durably (Postgres, from `DATABASE_URL`), and in development,
 * where the memory store is fine for trying the flow out. A production build
 * without a database answers false, and then:
 *
 *  - the section nav hides Settings, and `/setup/` redirects home;
 *  - the save action and the setup page's fields route refuse;
 *  - each account resolves from a fresh guess by name (`resolveByGuess`);
 *  - `requireSetup` returns an unready schema instead of redirecting, and the
 *    install hook asks Teambridge for no `setupPath`.
 *
 * Choices saved into memory on a production server would last until the next
 * cold start, on one instance of several, so hiding the page is the honest
 * option. Read it on the server; it reads the environment.
 */
export function settingsEnabled(): boolean {
  return configStore.persistent || process.env.NODE_ENV !== 'production';
}

/**
 * Resolve `spec` for the client's account, applying the bindings saved for
 * that account. Same caching as `resolveSchema`. Use the app's own access
 * (`getTBClient({ accountId })`): the schema is account structure, not user
 * data.
 *
 * On first contact with an account — no config saved yet, which is the
 * install hook's call or, for an account the hook never reached, its first
 * request — it initializes the account first (see `initializeAccount`).
 * Without Settings (`settingsEnabled`) nothing is saved: every account
 * resolves from the guess, made afresh (`resolveByGuess`).
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
  if (!settingsEnabled()) return resolveByGuess(client, spec);

  const config = await configStore.get(client.accountId);
  if (config) return resolveSchema(client, spec, { bindings: config.bindings });

  // First contact. The guess reads the account's collections and the fields
  // of the ones it matches; the resolution that follows reads the same
  // lists, so hand it what the guess read instead of reading them twice.
  const structure = readAccountStructure(client);
  const bindings = await initializeAccount(client, spec, structure);
  return resolveSchema(client, spec, { bindings, structure });
}

/**
 * First contact with an account: make the good-faith guess at its bindings
 * by name (`guessBindings`) and save it, so an account whose collections
 * carry the expected names works at once and the rest start setup with the
 * obvious slots filled. Idempotent: the same account guesses the same way,
 * and once a config exists it is never guessed over — an admin's choices in
 * Settings, including "Not used", stay. Returns what was saved.
 *
 * Pass the `structure` the caller will resolve with so the guess and the
 * resolution share their reads; without one the guess reads on its own.
 */
export async function initializeAccount<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  structure: AccountStructure = readAccountStructure(client)
): Promise<SchemaBindings> {
  const accountId = client.accountId;
  if (!accountId) throw new Error('initializeAccount needs a client that names its account.');
  const bindings = await guessBindings(client, spec, undefined, structure);
  await configStore.set(accountId, { bindings, updatedAt: new Date().toISOString() });
  invalidateSchema(accountId);
  return bindings;
}

/**
 * `resolveAccountSchema`, plus the redirect: when a required collection or
 * field is unresolved (`resolved.ready === false`) the user is sent to the
 * setup page instead of a page that can't work.
 *
 * Without Settings (`settingsEnabled`) there is no page to send anyone to, so
 * it returns the unready schema instead. Check `ready` and show the notice in
 * place of the page's content:
 *
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   if (!resolved.ready) return <SetupNotice issues={resolved.issues} />;
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
  if (!resolved.ready && settingsEnabled()) redirect(options.setupPath ?? SETUP_PATH);
  return resolved;
}
