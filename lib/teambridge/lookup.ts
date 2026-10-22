import { TBApiError, type TBClient } from './client/TBClient';
import type { DataRecord, Field } from './client/types';

/**
 * Display names for linked records — the assignee on a shift, the location
 * on a job — without reading every one of them on every page view.
 *
 * Reference fields hold record ids, and the Open API has no way to read
 * several records by id in one call: a filter matches one value, and an
 * `_in` operator is silently ignored. Reading each linked record per render
 * is what spends the rate limit — 50 shifts with 50 different assignees is
 * 50 calls a page view, from a budget of 720 a minute shared by every user
 * of the account. So `lookupNames` keeps the names:
 *
 *  - **per account, for ten minutes**, in memory on `globalThis` (like the
 *    schema cache), holding only the name, never the record;
 *  - **"not found" for one minute**, so a deleted record isn't read again on
 *    every load;
 *  - **shared by concurrent callers**, so ten people opening the app at once
 *    read each record once;
 *  - with **at most `maxReads` new reads per call** (25 by default), four at
 *    a time. Ids past the cap are left out of the result and read by a later
 *    call, so a cold start can't spend a large share of the limit in one burst.
 *
 * The cache is shared by every user of the account. So read with the app's
 * own access, `getTBClient({ accountId })`, and pass only ids taken from
 * records the current user read themselves — the assignee ids on shifts they
 * can see. What is shared is then the name behind a link the person could
 * already see. Pass `seed` with records of the collection already read in
 * this request (a first page of users, read as the user) so their names cost
 * nothing and are remembered for the next caller.
 *
 * @example
 *   const names = await lookupNames(getTBClient({ accountId }), users.id, shifts.map((s) => s.userId), {
 *     fields: [firstName, lastName],
 *     seed: usersPage.data,
 *   });
 *   names.get(shift.userId); // "Ada Lovelace", or undefined: no name yet, show a fallback
 */

const NAME_TTL_MS = 10 * 60_000;
const MISSING_TTL_MS = 60_000;
const DEFAULT_MAX_READS = 25;
const READ_CONCURRENCY = 4;
/** Per account and collection; the oldest entries go first past this. */
const MAX_ENTRIES = 10_000;

export interface LookupNamesOptions {
  /**
   * The fields that make up the name, in order, joined with spaces: First
   * Name and Last Name, say. `null` entries (an optional slot that didn't
   * resolve) are skipped; with none left, nothing is read.
   */
  fields: Array<Field | null | undefined>;
  /** Records of the collection already read in this request. Their names are used, and remembered. */
  seed?: DataRecord[] | null;
  /** New reads allowed in this call. The rest wait for a later call. Defaults to 25. */
  maxReads?: number;
}

type NameEntry = { expiresAt: number; name: Promise<string | null> };
/** `accountId|collectionId|fieldIds` → recordId → name. */
type NameCache = Map<string, Map<string, NameEntry>>;

// On `globalThis` for the same reason as the schema cache: Next bundles each
// route on its own, and a module-level map would be one cache per route.
const NAME_CACHE_KEY = '__tbNameCache';
type WithNameCache = typeof globalThis & { [NAME_CACHE_KEY]?: NameCache };

function nameCache(): NameCache {
  const globals = globalThis as WithNameCache;
  return (globals[NAME_CACHE_KEY] ??= new Map());
}

/** The record's name from `fields`, or null when they're all empty. */
export function nameFrom(record: DataRecord, fields: Field[]): string | null {
  const parts = fields
    .map((field) => record[field.id])
    .map((value) =>
      typeof value === 'string' ? value.trim() : typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
    )
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Names for `ids` in the collection, from the cache where it has them and
 * read with `client` where it doesn't, up to `maxReads`. Returns only the
 * ids with a name: one that is missing either has none, no longer exists,
 * failed to read (logged, not cached), or is waiting past the cap. Show a
 * fallback for it, such as "Unknown".
 */
export async function lookupNames(
  client: TBClient,
  collectionId: string,
  ids: Iterable<string | null | undefined>,
  options: LookupNamesOptions
): Promise<Map<string, string>> {
  const accountId = client.accountId;
  if (!accountId) {
    throw new Error('lookupNames needs a client that names its account. Build it with getTBClient({ accountId }).');
  }
  const result = new Map<string, string>();
  const fields = options.fields.filter((field): field is Field => Boolean(field));
  if (fields.length === 0) return result;

  const key = `${accountId}|${collectionId}|${fields.map((field) => field.id).join(',')}`;
  const cache = nameCache();
  let entries = cache.get(key);
  if (!entries) {
    entries = new Map();
    cache.set(key, entries);
  }
  const now = Date.now();
  for (const [id, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(id);
  }

  // Names already in hand this request: use them, and keep them for others.
  for (const record of options.seed ?? []) {
    entries.delete(record.id); // re-inserted last, so it counts as newest
    entries.set(record.id, { expiresAt: now + NAME_TTL_MS, name: Promise.resolve(nameFrom(record, fields)) });
  }

  const wanted = new Set<string>();
  for (const id of ids) if (id) wanted.add(id);

  const maxReads = options.maxReads ?? DEFAULT_MAX_READS;
  const waiting: Array<[string, Promise<string | null>]> = [];
  const toRead: Array<{ id: string; entry: NameEntry; done: (name: string | null) => void }> = [];
  for (const id of wanted) {
    const cached = entries.get(id);
    if (cached) {
      waiting.push([id, cached.name]);
      continue;
    }
    if (toRead.length >= maxReads) continue;
    // Registered before reading, so a concurrent caller shares this read.
    let done!: (name: string | null) => void;
    const entry: NameEntry = { expiresAt: now + NAME_TTL_MS, name: new Promise((resolve) => (done = resolve)) };
    entries.set(id, entry);
    toRead.push({ id, entry, done });
    waiting.push([id, entry.name]);
  }

  const failures: unknown[] = [];
  let next = 0;
  const reader = async () => {
    while (next < toRead.length) {
      const { id, entry, done } = toRead[next++];
      try {
        done(nameFrom(await client.collections.records.get(collectionId, id), fields));
      } catch (error) {
        if (error instanceof TBApiError && error.status === 404) {
          entry.expiresAt = Date.now() + MISSING_TTL_MS;
        } else {
          // Not cached: the next call tries again.
          if (entries.get(id) === entry) entries.delete(id);
          failures.push(error);
        }
        done(null);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, toRead.length) }, reader));
  if (failures.length > 0) {
    console.error(`[Teambridge] lookupNames: ${failures.length} of ${toRead.length} reads failed`, failures[0]);
  }

  for (const [id, name] of waiting) {
    const value = await name;
    if (value) result.set(id, value);
  }

  // Bound the cache: Map keeps insertion order, so the oldest go first.
  for (const id of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    entries.delete(id);
  }
  return result;
}

/**
 * Forget the account's cached names, so the next lookup reads them again.
 * Call it after the app renames a record whose name it shows (names edited
 * elsewhere show up within ten minutes on their own).
 */
export function invalidateNames(accountId: string): void {
  const prefix = `${accountId}|`;
  const cache = nameCache();
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
