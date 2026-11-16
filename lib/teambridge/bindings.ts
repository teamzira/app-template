import type { TBClient } from './client/TBClient';
import type { AppBindings } from './client/types';
import type { SchemaBindings, SchemaSpec } from './schema';

/**
 * Teambridge's bindings for an account: what the admin mapped each of the
 * app's manifest requirements to when installing the app (or re-reviewing
 * its setup) in the App Library. They are the first source of truth for the
 * spec's slots; the app's own saved bindings and the spec's pinned ids fill
 * in what Teambridge doesn't hold, and the first-contact guess by name fills
 * the rest (see `resolveAccountSchema` in `./setup`).
 *
 * Requirement keys are spec keys (see `./manifest`): `shifts` for a
 * collection, `shifts.start` for a field, `shifts.status.open` for one of a
 * select field's `options`, and `std.user` for a built-in collection the
 * manifest added because a link field points at it.
 */

/** `Expiring soon` → `expiring_soon`: the requirement key segment of a select option the spec names. */
export function optionKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Merge Teambridge's bindings (requirement key → id) over the app's own
 * saved bindings, slot by slot. The one place requirement keys are mapped
 * onto the spec.
 *
 *  - A key Teambridge holds wins: `shifts` binds the collection,
 *    `shifts.start` the field, `shifts.status.open` an option.
 *  - `std.<kind>` binds a spec collection with `standard: '<kind>'` when
 *    Teambridge holds nothing under that collection's own key (the manifest
 *    names a declared standard collection by its spec key, and an older one
 *    may have named it `std.<kind>`).
 *  - Otherwise the app's saved binding applies, including `null` ("Not
 *    used"). Saved field choices are dropped when Teambridge bound the
 *    collection to a different one: they are fields of the other collection.
 *  - Option bindings come only from Teambridge, and only with the field they
 *    belong to: an option id means nothing on another field.
 *  - Keys the spec doesn't have are ignored.
 *
 * What is left unset falls to the spec's pinned id, then to the guess.
 */
export function mergeBindings(
  spec: SchemaSpec,
  teambridge: Record<string, string> | null | undefined,
  saved: SchemaBindings | null | undefined
): SchemaBindings {
  const held = (key: string) => {
    const id = teambridge?.[key];
    return typeof id === 'string' && id ? id : undefined;
  };
  const merged: SchemaBindings = {};

  for (const [collectionKey, collectionSpec] of Object.entries(spec)) {
    const own = saved?.[collectionKey];
    const heldId =
      held(collectionKey) ?? (collectionSpec.standard ? held(`std.${collectionSpec.standard}`) : undefined);
    const id = heldId ?? own?.id;
    const ownFields = heldId === undefined || own?.id === heldId ? own?.fields : undefined;

    const fields: Record<string, string | null> = {};
    const options: Record<string, Record<string, string>> = {};
    for (const [fieldKey, fieldSpec] of Object.entries(collectionSpec.fields)) {
      const heldField = held(`${collectionKey}.${fieldKey}`);
      const value = heldField ?? ownFields?.[fieldKey];
      if (value !== undefined) fields[fieldKey] = value;
      if (!heldField) continue;
      for (const label of fieldSpec.options ?? []) {
        const key = optionKey(label);
        const optionId = held(`${collectionKey}.${fieldKey}.${key}`);
        if (optionId) (options[fieldKey] ??= {})[key] = optionId;
      }
    }

    if (id === undefined && Object.keys(fields).length === 0) continue;
    merged[collectionKey] = {
      ...(id !== undefined ? { id } : {}),
      fields,
      ...(Object.keys(options).length > 0 ? { options } : {}),
    };
  }
  return merged;
}

const BINDINGS_TTL_MS = 5 * 60_000;
const NO_BINDINGS: AppBindings = { slug: null, bindings: {} };
type BindingsEntry = { expiresAt: number; value: Promise<AppBindings> };
type BindingsCache = Map<string, Map<string, BindingsEntry>>;

// On `globalThis` for the same reason as the schema cache (`./schema`): each
// route bundle has its own copy of this module.
const BINDINGS_CACHE_KEY = '__tbTeambridgeBindingsCache';
type WithBindingsCache = typeof globalThis & { [BINDINGS_CACHE_KEY]?: BindingsCache };

function bindingsCache(): BindingsCache {
  const globals = globalThis as WithBindingsCache;
  return (globals[BINDINGS_CACHE_KEY] ??= new Map());
}

/**
 * Teambridge's bindings for the client's account (`client.apps.getBindings()`),
 * cached per account for five minutes, with concurrent callers sharing one
 * request.
 *
 * `stamp` names the version of the account's setup the caller knows of — the
 * install hook records one in the config store on every install or
 * re-review — so a server instance that didn't receive the hook still reads
 * the new bindings on its next request instead of up to five minutes later.
 *
 * An account Teambridge holds nothing for answers `{ slug: null, bindings: {} }`
 * and the app falls back to its own setup. So does a failed read (logged, and
 * not cached, so the next request tries again): bindings are an improvement
 * on the fallback, never a reason for a page to fail.
 */
export function loadTeambridgeBindings(client: TBClient, stamp = ''): Promise<AppBindings> {
  const accountId = client.accountId;
  if (!accountId) {
    throw new Error(
      'loadTeambridgeBindings needs a client that names its account. Build it with getTBClient({ accountId }).'
    );
  }
  const cache = bindingsCache();
  const now = Date.now();
  const cached = cache.get(accountId)?.get(stamp);
  if (cached && cached.expiresAt > now) return cached.value;

  for (const [cachedAccountId, entries] of cache) {
    for (const [cachedStamp, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(cachedStamp);
    }
    if (entries.size === 0) cache.delete(cachedAccountId);
  }

  let entries = cache.get(accountId);
  if (!entries) {
    entries = new Map();
    cache.set(accountId, entries);
  }
  const entry: BindingsEntry = {
    expiresAt: now + BINDINGS_TTL_MS,
    value: client.apps.getBindings().catch((error: unknown) => {
      console.warn("[Teambridge] Couldn't read the app's bindings for", accountId, '- using its own setup.', error);
      const current = bindingsCache().get(accountId);
      if (current?.get(stamp) === entry) current.delete(stamp);
      return NO_BINDINGS;
    }),
  };
  entries.set(stamp, entry);
  return entry.value;
}

/** Forget the account's cached Teambridge bindings. `invalidateSchema` calls it. */
export function forgetTeambridgeBindings(accountId: string): void {
  bindingsCache().delete(accountId);
}
