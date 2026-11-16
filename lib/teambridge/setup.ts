import { redirect } from 'next/navigation';
import type { TBClient } from './client/TBClient';
import type { AppBindings } from './client/types';
import { loadTeambridgeBindings, mergeBindings } from './bindings';
import { configStore, type AccountConfig } from './config-store';
import {
  guessBindings,
  invalidateSchema,
  readAccountStructure,
  resolveByGuess,
  resolveSchema,
  type AccountStructure,
  type ResolvedSchema,
  type SchemaBindings,
  type SchemaIssue,
  type SchemaSpec,
} from './schema';

/**
 * The setup gate: resolve the app's schema for an account with the account's
 * bindings, and send the user to the setup page while a required slot is
 * still unresolved.
 *
 * An account's bindings come from Teambridge first: what the admin mapped
 * each manifest requirement to when installing the app (`./bindings`). The
 * app's own saved bindings, the spec's pinned ids and the first-contact guess
 * by name fill what Teambridge doesn't hold, which for an account installed
 * before Teambridge recorded bindings (or a dev client) is everything. When
 * Teambridge holds bindings for the account, its setup is fixed in
 * Teambridge's App Library: the setup page then links there instead of
 * showing its own pickers.
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
 * so it has no Settings page (`settingsEnabled`). There the gate throws
 * `SchemaNotReadyError` instead of redirecting, and the page fails the way it
 * fails for any other load error; the server log says what is missing.
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
 *  - each account resolves from a fresh guess (`resolveByGuess`): the ids
 *    pinned in the spec, or else the one match by name;
 *  - `requireSetup` throws instead of redirecting when that guess leaves a
 *    required slot unresolved, and the install hook asks for no `setupPath`.
 *
 * Choices saved into memory on a production server would last until the next
 * cold start, on one instance of several, so hiding the page is the honest
 * option. Read it on the server; it reads the environment.
 */
export function settingsEnabled(): boolean {
  return configStore.persistent || process.env.NODE_ENV !== 'production';
}

/**
 * Resolve `spec` for the client's account. Same caching as `resolveSchema`.
 * Use the app's own access (`getTBClient({ accountId })`): the schema is
 * account structure, not user data.
 *
 * Bindings apply slot by slot, first match wins (`mergeBindings`):
 * Teambridge's, then the ones saved for the account in the config store,
 * then the id pinned in the spec. On first contact with an account — no
 * bindings saved yet, which is the install hook's call or, for an account the
 * hook never reached, its first request — the slots still unset are guessed
 * by name and saved (see `initializeAccount`). Without Settings
 * (`settingsEnabled`) nothing is saved: the guess is made afresh
 * (`resolveByGuess`), starting from Teambridge's bindings.
 *
 * `resolved.teambridgeSlug` says whether Teambridge holds bindings for the
 * account, and so where its setup is fixed.
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
  const config = settingsEnabled() ? await configStore.get(client.accountId) : null;
  const teambridge = await teambridgeBindings(client, config);
  const teambridgeSlug = teambridgeSetupSlug(teambridge);
  const fromTeambridge = mergeBindings(spec, teambridge.bindings, null);
  if (!settingsEnabled()) return resolveByGuess(client, spec, { existing: fromTeambridge, teambridgeSlug });

  if (config?.bindings) {
    const bindings = mergeBindings(spec, teambridge.bindings, config.bindings);
    return resolveSchema(client, spec, { bindings, teambridgeSlug });
  }

  // First contact. The guess reads the account's collections and the fields
  // of the ones it matches; the resolution that follows reads the same
  // lists, so hand it what the guess read instead of reading them twice.
  const structure = readAccountStructure(client);
  const saved = await initializeAccount(client, spec, structure, fromTeambridge);
  const bindings = mergeBindings(spec, teambridge.bindings, saved);
  return resolveSchema(client, spec, { bindings, structure, teambridgeSlug });
}

/** Teambridge's bindings for the account, reread whenever the install hook has recorded a newer setup. */
function teambridgeBindings(client: TBClient, config: AccountConfig | null): Promise<AppBindings> {
  return loadTeambridgeBindings(client, config?.teambridgeSetup?.reviewedAt);
}

/** The app's slug in Teambridge when Teambridge holds bindings for the account, else null. */
function teambridgeSetupSlug(teambridge: AppBindings): string | null {
  if (Object.keys(teambridge.bindings).length === 0) return null;
  return teambridge.slug ?? process.env.APP_SLUG ?? null;
}

/**
 * Whether the account's setup is fixed in Teambridge, and under which slug:
 * non-null when Teambridge holds bindings for it. The setup page asks before
 * deciding what to show.
 */
export async function teambridgeSetupFor(client: TBClient): Promise<string | null> {
  if (!client.accountId) throw new Error('teambridgeSetupFor needs a client that names its account.');
  const config = settingsEnabled() ? await configStore.get(client.accountId) : null;
  return teambridgeSetupSlug(await teambridgeBindings(client, config));
}

/**
 * First contact with an account: make the good-faith guess by name
 * (`guessBindings`) at every slot `existing` (Teambridge's bindings) leaves
 * unset, and save it, so an account whose collections carry the expected
 * names works at once and the rest start setup with the obvious slots
 * filled. Field slots Teambridge holds are not saved: they stay Teambridge's,
 * so an admin who later skips one there unbinds it here too. Idempotent: the
 * same account guesses the same way, and once bindings are saved they are
 * never guessed over — an admin's choices in Settings, including "Not used",
 * stay. Returns what was saved.
 *
 * Pass the `structure` the caller will resolve with so the guess and the
 * resolution share their reads; without one the guess reads on its own.
 */
export async function initializeAccount<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  structure: AccountStructure = readAccountStructure(client),
  existing?: SchemaBindings | null
): Promise<SchemaBindings> {
  const accountId = client.accountId;
  if (!accountId) throw new Error('initializeAccount needs a client that names its account.');
  const guessed = await guessBindings(client, spec, existing, structure);
  const bindings: SchemaBindings = {};
  for (const [key, binding] of Object.entries(guessed)) {
    if (!binding) continue;
    const held = existing?.[key]?.fields ?? {};
    const fields = Object.fromEntries(Object.entries(binding.fields ?? {}).filter(([fieldKey]) => !(fieldKey in held)));
    bindings[key] = { ...(binding.id !== undefined ? { id: binding.id } : {}), fields };
  }
  const current = await configStore.get(accountId);
  await configStore.set(accountId, { ...current, bindings, updatedAt: new Date().toISOString() });
  invalidateSchema(accountId);
  return bindings;
}

/**
 * Record an install, or a re-review of the app's setup, in Teambridge (the
 * install hook calls it), and forget the account's cached schema. Every
 * server instance rereads Teambridge's bindings on its next request for the
 * account, not just the one that received the hook. Does nothing without
 * Settings: there is nowhere durable to record it.
 */
export async function recordTeambridgeSetup(accountId: string, manifestVersion?: string): Promise<void> {
  if (settingsEnabled()) {
    const current = await configStore.get(accountId);
    await configStore.set(accountId, {
      ...current,
      teambridgeSetup: { reviewedAt: new Date().toISOString(), ...(manifestVersion ? { manifestVersion } : {}) },
    });
  }
  invalidateSchema(accountId);
}

/**
 * Where to send an admin for `resolved`: the setup page while a required slot
 * is unresolved and there is a setup to finish — the app's own (with
 * Settings) or Teambridge's (when it holds the account's bindings; the page
 * then links there). Undefined otherwise. The gate redirects to it, and the
 * install hook returns it as `setupPath`.
 */
export function setupPathFor(resolved: Pick<ResolvedSchema<SchemaSpec>, 'ready' | 'teambridgeSlug'>): string | undefined {
  if (resolved.ready) return undefined;
  return settingsEnabled() || resolved.teambridgeSlug ? SETUP_PATH : undefined;
}

/**
 * `resolveAccountSchema`, plus the redirect: when a required collection or
 * field is unresolved (`resolved.ready === false`) the user is sent to the
 * setup page instead of a page that can't work. So what it returns is always
 * ready: every required field is there.
 *
 * Without Settings (`settingsEnabled`), and with no bindings in Teambridge,
 * there is no setup to send anyone to, and nothing anyone using the app could
 * do, so it throws `SchemaNotReadyError` instead. The page fails like it fails for any other
 * load error, and the error's message, in the server log, says what is
 * missing and why.
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
  if (!resolved.ready) {
    if (setupPathFor(resolved)) redirect(options.setupPath ?? SETUP_PATH);
    throw new SchemaNotReadyError(client.accountId ?? '', resolved.issues);
  }
  return resolved;
}

/**
 * Thrown by `requireSetup` on a deployment without Settings when a required
 * slot is unresolved. It is for the server log, not for people using the
 * app: catch it like any other load error and show the page's usual error
 * state. The message names the account and the missing slots.
 */
export class SchemaNotReadyError extends Error {
  readonly accountId: string;
  readonly issues: SchemaIssue[];

  constructor(accountId: string, issues: SchemaIssue[]) {
    const missing = issues
      .filter((issue) => issue.blocking)
      .map((issue) => (issue.field ? `${issue.collection} → ${issue.field}` : issue.collection))
      .join(', ');
    super(
      `[Teambridge] Account ${accountId} is missing required collections or fields (${missing}): neither an id ` +
        'pinned in app/schema.ts nor the guess by name found them, and this deployment has no database ' +
        '(DATABASE_URL), so they cannot be chosen in Settings. Pin their ids in app/schema.ts, or, for an app ' +
        'on several accounts, add the Neon integration and redeploy.'
    );
    this.name = 'SchemaNotReadyError';
    this.accountId = accountId;
    this.issues = issues;
  }
}
