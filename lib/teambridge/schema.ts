import type { TBClient } from './client/TBClient';
import type { Collection, Field } from './client/types';
import { forgetTeambridgeBindings, optionKey } from './bindings';

/**
 * Declares the collections and fields an app depends on — its *slots* — and
 * resolves them against an account once, instead of scattering lookups
 * through the code.
 *
 * Slots resolve by id. An account's **bindings** — the collection, field and
 * select option each slot is bound to — come first: the ones Teambridge
 * recorded when an admin installed the app against its manifest (`./bindings`),
 * then the ones saved in the app's config store (`./config-store`). An `id`
 * pinned in the spec is the default for accounts with neither. Nothing else:
 * a slot with none of these resolves to nothing until it is set.
 *
 * The same spec is the app's install manifest: `teambridge.manifest.ts` wraps
 * it, and `yarn manifest` turns it into the requirements Teambridge checks
 * before installing the app. The fields below marked "install" only affect
 * that. The spec's keys are the requirement keys Teambridge binds (`shifts`,
 * `shifts.start`), so never rename one.
 *
 * Names are used once, to make a good-faith **guess** at the bindings:
 * `guessBindings` matches each slot to the one collection or field with the
 * same name (exact, case-insensitive) and type. It runs at first contact with
 * an account, whose result is saved as ids, and it prefills unset slots on
 * the setup page (`/setup/`), where an admin confirms or changes them. After
 * that a rename in Teambridge changes nothing. The spec's `name` is also the
 * slot's label on the setup page and in messages.
 *
 * Pass the bindings as `resolveSchema(client, spec, { bindings })`, or call
 * `resolveAccountSchema` / `requireSetup` from `./setup`, which load them. A
 * deployment with nowhere to save bindings resolves from the guess alone,
 * made afresh rather than saved (`resolveByGuess`).
 *
 * Unresolved slots are reported, not thrown: `issues` lists every one, and
 * `ready` is false only when a `required` slot is unresolved. `requireSetup`
 * sends the user to the setup page for those; render `SetupNotice`
 * (`components/setup-notice.tsx`) for the rest and degrade the feature that
 * needs an optional slot.
 *
 * @example
 *   export const schema = defineSchema({
 *     shifts: {
 *       name: 'Shifts',
 *       fields: {
 *         start: { name: 'Start Time', type: 'DATETIME', required: true },
 *         assignee: { name: 'Assignee', type: 'LINK_TO_USER' },
 *       },
 *     },
 *   });
 *
 *   const { accountId } = await getTBContext();
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   const startField = resolved.collections.shifts.fields.start; // Field | null
 */

/** Built-in Teambridge collections. Matched by kind on install, whatever the account calls them. */
export type StandardCollection =
  | 'user'
  | 'shift'
  | 'location'
  | 'role'
  | 'job'
  | 'placement'
  | 'contact'
  | 'project'
  | 'document'
  | 'task'
  | 'shift_group'
  | 'timeoff'
  | 'break'
  | 'pay_periods';

export interface FieldSpec {
  /** The slot's label on the setup page and in messages, and the name `guessBindings` looks for. Resolution itself never uses it. */
  name: string;
  /** Pinned field UUID: the default for accounts with no binding for this slot. An account's binding overrides it. Single-account apps only. */
  id?: string;
  /**
   * Expected public type(s), as the Open API reports them (`DATETIME`,
   * `SINGLE_SELECT`, `LINK_TO_USER`…). The setup page offers only fields of
   * these types, and a bound or pinned field of another type is rejected. The
   * install manifest needs exactly one.
   */
  type?: string | string[];
  /** When true, the app cannot work without it and `ready` is false while it is unresolved. */
  required?: boolean;
  /** Install: one line on what the app uses this for, shown to the admin installing it. */
  purpose?: string;
  /** Install: other names accounts commonly give this field ("Payroll ID" for "Employee ID"). */
  synonyms?: string[];
  /** Install: offer to create the field when the account has nothing that fits. */
  createIfMissing?: boolean;
  /** Install: whether the app writes this field (the match must then be writable). Defaults to 'read'. */
  access?: 'read' | 'write';
  /**
   * Select fields: the options the app relies on, by name. Each is a slot of
   * its own, keyed by `optionKey(name)` (`'Expiring soon'` → `expiring_soon`)
   * and resolved in `resolved.collections.<collection>.options.<field>`: the
   * option Teambridge's install bound, else the one option with that name.
   * Install: matched or created with the field.
   */
  options?: string[];
  /** Install, link fields: holds several records rather than one. Defaults to false. */
  multiple?: boolean;
  /** Install, `CUSTOM_FIELD` links: the key of the collection spec it points at. */
  links?: string;
}

export interface CollectionSpec {
  /** The slot's label, and the name `guessBindings` looks for. Resolution itself never uses it. */
  name: string;
  /** Pinned collection UUID: the default for accounts with no binding. Single-account apps only. */
  id?: string;
  /** Defaults to true — most apps cannot do anything without their collections. */
  required?: boolean;
  /** Install: set for a built-in collection. Leave out for a custom one, matched by name. */
  standard?: StandardCollection;
  /** Install: what the app uses this collection for. */
  purpose?: string;
  /** Install: other names accounts commonly give this collection. */
  synonyms?: string[];
  fields: Record<string, FieldSpec>;
}

export type SchemaSpec = Record<string, CollectionSpec>;

/**
 * An account's choice of ids for the spec's slots, keyed like the spec. The
 * setup page writes them (see `./setup`); `resolveSchema` applies them as
 * pinned ids, over any id pinned in the spec.
 *
 *  - An id binds the slot to that collection or field.
 *  - `null` means the admin chose not to use the slot ("Not used"). It
 *    resolves to nothing and reports a `not-used` issue, blocking when the
 *    slot is required — so the setup page never offers it there.
 *  - A missing key means no choice was made yet: the spec's pinned id
 *    applies if there is one; otherwise the slot is `not-set` until an admin
 *    sets it (the setup page prefills a guess by name for it). That is how a
 *    slot added to the spec after an account was set up asks to be set,
 *    while everything else the account chose stays.
 *
 * Keys the spec doesn't have are ignored.
 */
export type SchemaBindings = {
  [collectionKey: string]:
    | {
        id?: string | null;
        fields?: { [fieldKey: string]: string | null | undefined };
        /** Option ids by field key, then option key. Only Teambridge's bindings set these (see `./bindings`). */
        options?: { [fieldKey: string]: { [optionKey: string]: string } | undefined };
      }
    | undefined;
};

export interface ResolveSchemaOptions {
  /** The account's saved bindings, if any. See {@link SchemaBindings}. */
  bindings?: SchemaBindings | null;
  /** Reads of the account already made (`readAccountStructure`), to resolve from instead of reading again. */
  structure?: AccountStructure;
  /**
   * The app's slug in Teambridge, when Teambridge holds bindings for the
   * account: its setup is then fixed in Teambridge's App Library rather than
   * the app's own Settings, and issue messages say so. Set by
   * `resolveAccountSchema`.
   */
  teambridgeSlug?: string | null;
}

/**
 * The reads a resolution makes — the account's collections, and the fields
 * of each collection it looks at — memoized, so that two steps over the same
 * account read each list once. First contact is the case: `guessBindings`
 * reads them to guess, and `resolveSchema` would read them again to resolve
 * from the guess; `initializeAccount` (`./setup`) hands both the same
 * structure instead. `guessBindings` and `resolveSchema` make their own when
 * none is passed.
 */
export interface AccountStructure {
  /** Every collection on the account. */
  collections(): Promise<Collection[]>;
  /** The fields of one collection. */
  fields(collectionId: string): Promise<Field[]>;
}

/** An `AccountStructure` that reads from `client` on first use and remembers what it read. */
export function readAccountStructure(client: TBClient): AccountStructure {
  let collections: Promise<Collection[]> | undefined;
  const fields = new Map<string, Promise<Field[]>>();
  return {
    collections: () => (collections ??= client.collections.list()),
    fields: (collectionId) => {
      let list = fields.get(collectionId);
      if (!list) {
        list = client.collections.getFields(collectionId);
        fields.set(collectionId, list);
      }
      return list;
    },
  };
}

export type ResolvedSchema<S extends SchemaSpec> = {
  /** True when every required collection and field resolved. */
  ready: boolean;
  collections: {
    [K in keyof S]: {
      /** Null when the collection could not be found. */
      id: string | null;
      name: string;
      fields: { [F in keyof S[K]['fields']]: Field | null };
      /**
       * For each select field with `options` in the spec: option key →
       * the option it resolved to, or null. Empty for the other fields.
       */
      options: { [F in keyof S[K]['fields']]?: Record<string, SelectOption | null> };
    };
  };
  issues: SchemaIssue[];
  /**
   * The app's slug in Teambridge when Teambridge holds this account's
   * bindings, else null. Then setup is fixed in Teambridge's App Library
   * (`appLibrarySetupPath` in `./host`), not on the app's own setup page.
   */
  teambridgeSlug: string | null;
};

/** One option of a select field. */
export type SelectOption = NonNullable<Field['selectOptions']>[number];

export interface SchemaIssue {
  /**
   * `not-set`: no binding and no pinned id — needs a choice in setup (for an option: none bound, and none by that name).
   * `not-used`: the admin set the slot to "Not used" — a decision, not a problem.
   * `not-found`: the bound or pinned id no longer exists on the account.
   * `wrong-type`: the bound or pinned field is not one of the spec's types.
   */
  kind: 'not-set' | 'not-used' | 'not-found' | 'wrong-type';
  /** Whether this issue stops the app working (a required slot is unresolved). */
  blocking: boolean;
  /** The collection slot's label (`CollectionSpec.name`). */
  collection: string;
  /** The field slot's label (`FieldSpec.name`), for field and option issues. */
  field?: string;
  /** The option's name, as the spec lists it, for option issues. */
  option?: string;
  /** Plain-language description, safe to show an admin. */
  message: string;
}

export function defineSchema<S extends SchemaSpec>(spec: S): S {
  return spec;
}

const SCHEMA_TTL_MS = 5 * 60_000;
type CacheEntry = { expiresAt: number; value: Promise<unknown> };
type SchemaCache = Map<string, Map<string, CacheEntry>>;

// The cache lives on `globalThis`, not at module level: Next bundles each
// route on its own, so a page, a route handler and a server action can each
// hold their own instance of this module. A module-level map would then be
// invalidated in one bundle (the uninstall hook, the setup action) while the
// page kept serving the stale copy from another.
const SCHEMA_CACHE_KEY = '__tbSchemaCache';
type WithSchemaCache = typeof globalThis & { [SCHEMA_CACHE_KEY]?: SchemaCache };

/** accountId → "spec + bindings" → in-flight or settled resolution. */
function schemaCache(): SchemaCache {
  const globals = globalThis as WithSchemaCache;
  return (globals[SCHEMA_CACHE_KEY] ??= new Map());
}

/**
 * The bindings that apply to `spec`, in spec order: two sets of bindings
 * that pick the same ids share an entry, and a save that changes any id
 * misses the cache on every server instance, not just the one that saved.
 */
function bindingsKey(spec: SchemaSpec, bindings: SchemaBindings | undefined): string {
  const pin = (value: string | null | undefined) => (value === null ? '!' : (value ?? ''));
  return Object.entries(spec)
    .map(([key, collectionSpec]) => {
      const binding = bindings?.[key];
      const fields = Object.keys(collectionSpec.fields)
        .map((fieldKey) => {
          const options = binding?.options?.[fieldKey];
          const optionPins = options
            ? Object.keys(options)
                .sort()
                .map((optionKey) => `${optionKey}>${options[optionKey]}`)
                .join('+')
            : '';
          return `${fieldKey}=${pin(binding?.fields?.[fieldKey])}${optionPins ? `[${optionPins}]` : ''}`;
        })
        .join(',');
      return `${key}=${pin(binding?.id)}:${fields}`;
    })
    .join(';');
}

/**
 * Resolve a schema spec against the client's account. Cached per account
 * (and per set of bindings) for five minutes, and concurrent callers share
 * one in-flight resolution — so several components on one page asking at
 * once cost one `collections.list` and one `getFields` per collection, not
 * one each.
 *
 * The cache key is the client's `accountId`, which `getTBClient()` always
 * sets. Resolve with the app's own access, `getTBClient({ accountId })`: the
 * schema is account structure, not user data, so the user context would not
 * change the answer and must never be the key (it is re-signed on every
 * request, so nothing would ever be cached).
 */
export function resolveSchema<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  options: ResolveSchemaOptions = {}
): Promise<ResolvedSchema<S>> {
  const accountId = client.accountId;
  if (!accountId) {
    throw new Error(
      'resolveSchema needs a client that names its account. Build it with getTBClient({ accountId }).'
    );
  }
  const bindings = options.bindings ?? undefined;
  const teambridgeSlug = options.teambridgeSlug || null;
  // Keyed by the spec's content, not its identity: every bundle has its own
  // copy of the `app/schema.ts` object, and they should share one entry.
  const key = `${JSON.stringify(spec)}|${bindingsKey(spec, bindings)}|${teambridgeSlug ?? ''}`;
  const cache = schemaCache();
  const now = Date.now();
  const cached = cache.get(accountId)?.get(key);
  if (cached && cached.expiresAt > now) return cached.value as Promise<ResolvedSchema<S>>;

  // Drop every expired entry, not just this one, so accounts that stop
  // calling don't stay in memory for the life of the server.
  for (const [cachedAccountId, entries] of cache) {
    for (const [cachedKey, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(cachedKey);
    }
    if (entries.size === 0) cache.delete(cachedAccountId);
  }

  let entries = cache.get(accountId);
  if (!entries) {
    entries = new Map();
    cache.set(accountId, entries);
  }
  const value = resolveUncached(spec, bindings, options.structure ?? readAccountStructure(client), teambridgeSlug);
  const entry: CacheEntry = { expiresAt: now + SCHEMA_TTL_MS, value };
  entries.set(key, entry);
  value.catch(() => {
    // Never cache a failure — but only drop this entry, not a newer one.
    const current = schemaCache().get(accountId);
    if (current?.get(key) === entry) current.delete(key);
  });
  return value;
}

/**
 * Forget every cached resolution for an account, so the next render looks at
 * the account as it is now. Call it after saving the account's bindings (the
 * setup page does) and from the lifecycle hooks.
 *
 * New bindings miss the cache on their own, on every server instance, because
 * they are part of the key. What this clears is the entry for *unchanged*
 * bindings — which would otherwise keep reporting a field as missing for up
 * to five minutes after an admin added it and saved the settings again —
 * and, on a deployment without a database, the account's cached guess. It
 * also forgets the account's cached Teambridge bindings (`./bindings`).
 */
export function invalidateSchema(accountId: string): void {
  schemaCache().delete(accountId);
  guessCache().delete(accountId);
  forgetTeambridgeBindings(accountId);
}

type GuessEntry = { expiresAt: number; bindings: Promise<SchemaBindings> };
type GuessCache = Map<string, Map<string, GuessEntry>>;
const GUESS_CACHE_KEY = '__tbGuessCache';
type WithGuessCache = typeof globalThis & { [GUESS_CACHE_KEY]?: GuessCache };

/** accountId → spec → the guess `resolveByGuess` resolves from. On `globalThis` for the same reason as the schema cache. */
function guessCache(): GuessCache {
  const globals = globalThis as WithGuessCache;
  return (globals[GUESS_CACHE_KEY] ??= new Map());
}

/**
 * Resolve `spec` from a good-faith guess by name instead of saved bindings:
 * how a deployment with nowhere to save them works (`resolveAccountSchema`
 * in `./setup` calls it there). Nothing is stored. The guess is cached per
 * account for the same five minutes as a resolution, except while it leaves
 * a required slot unresolved: then each call guesses again, so an admin who
 * renames a field in Teambridge to the name the app expects sees the app on
 * the next load, and a healthy account costs no more reads than a saved one.
 */
export async function resolveByGuess<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  options: { existing?: SchemaBindings | null; teambridgeSlug?: string | null } = {}
): Promise<ResolvedSchema<S>> {
  const accountId = client.accountId;
  if (!accountId) {
    throw new Error(
      'resolveByGuess needs a client that names its account. Build it with getTBClient({ accountId }).'
    );
  }
  // Teambridge's bindings, when it holds any, are what the guess starts from.
  const existing = options.existing ?? undefined;
  const teambridgeSlug = options.teambridgeSlug;
  const key = `${JSON.stringify(spec)}|${bindingsKey(spec, existing)}`;
  const cache = guessCache();
  const now = Date.now();
  const cached = cache.get(accountId)?.get(key);
  if (cached && cached.expiresAt > now) {
    return resolveSchema(client, spec, { bindings: await cached.bindings, teambridgeSlug });
  }

  for (const [cachedAccountId, entries] of cache) {
    for (const [cachedKey, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(cachedKey);
    }
    if (entries.size === 0) cache.delete(cachedAccountId);
  }

  let entries = cache.get(accountId);
  if (!entries) {
    entries = new Map();
    cache.set(accountId, entries);
  }
  // The guess and the resolution read the same lists; share them.
  const structure = readAccountStructure(client);
  const bindings = guessBindings(client, spec, existing, structure);
  const entry: GuessEntry = { expiresAt: now + SCHEMA_TTL_MS, bindings };
  entries.set(key, entry);
  const forget = () => {
    const current = guessCache().get(accountId);
    if (current?.get(key) === entry) current.delete(key);
  };
  bindings.catch(forget);

  const resolved = await resolveSchema(client, spec, { bindings: await bindings, structure, teambridgeSlug });
  if (!resolved.ready) forget();
  return resolved;
}

const typesOf = (spec: FieldSpec) => (spec.type ? (Array.isArray(spec.type) ? spec.type : [spec.type]) : null);

/** Where a slot's id came from: the account's bindings (an admin's choice) or the spec (a developer's). */
type Pin = { id: string; source: 'bindings' | 'spec' };

function pinFor(bound: string | null | undefined, specId: string | undefined): Pin | null {
  if (bound) return { id: bound, source: 'bindings' };
  if (specId) return { id: specId, source: 'spec' };
  return null;
}

async function resolveUncached<S extends SchemaSpec>(
  spec: S,
  bindings: SchemaBindings | undefined,
  structure: AccountStructure,
  teambridgeSlug: string | null
): Promise<ResolvedSchema<S>> {
  const issues: SchemaIssue[] = [];
  const allCollections = await structure.collections();
  // Where an admin fixes an unresolved slot, for the messages.
  const where = teambridgeSlug ? "the app's setup in Teambridge" : "the app's settings";

  const entries = await Promise.all(
    Object.entries(spec).map(async ([key, collectionSpec]) => {
      const collectionRequired = collectionSpec.required ?? true;
      const binding = bindings?.[key];
      const fields: Record<string, Field | null> = {};
      const options: Record<string, Record<string, SelectOption | null>> = {};

      const collection = findCollection(allCollections, collectionSpec, binding?.id, issues, collectionRequired, where);
      if (!collection) {
        for (const fieldKey of Object.keys(collectionSpec.fields)) fields[fieldKey] = null;
        return [key, { id: null, name: collectionSpec.name, fields, options }] as const;
      }

      const available = await structure.fields(collection.id);
      for (const [fieldKey, fieldSpec] of Object.entries(collectionSpec.fields)) {
        const field = findField(
          available,
          collectionSpec.name,
          fieldSpec,
          binding?.fields?.[fieldKey],
          issues,
          collectionRequired,
          where
        );
        fields[fieldKey] = field;
        if (field && fieldSpec.options?.length) {
          options[fieldKey] = findOptions(
            field,
            collectionSpec.name,
            fieldSpec,
            binding?.options?.[fieldKey],
            issues,
            collectionRequired,
            where
          );
        }
      }
      return [key, { id: collection.id, name: collection.name, fields, options }] as const;
    })
  );

  return {
    ready: !issues.some((issue) => issue.blocking),
    collections: Object.fromEntries(entries) as ResolvedSchema<S>['collections'],
    issues,
    teambridgeSlug,
  };
}

function findCollection(
  all: Collection[],
  spec: CollectionSpec,
  bound: string | null | undefined,
  issues: SchemaIssue[],
  required: boolean,
  where: string
): Collection | null {
  const label = spec.name;
  if (bound === null) {
    issues.push({
      kind: 'not-used',
      blocking: required,
      collection: label,
      message: `"${label}" is set to "Not used" in the app's settings.`,
    });
    return null;
  }
  const pin = pinFor(bound, spec.id);
  if (!pin) {
    issues.push({
      kind: 'not-set',
      blocking: required,
      collection: label,
      message: `No collection is set for "${label}" yet. Choose one in ${where}.`,
    });
    return null;
  }
  const collection = all.find((c) => c.id === pin.id);
  if (!collection) {
    issues.push({
      kind: 'not-found',
      blocking: required,
      collection: label,
      message:
        pin.source === 'bindings'
          ? `The collection set for "${label}" in ${where} no longer exists. Choose another.`
          : `No collection on this account has the id pinned for "${label}" (${pin.id}). Choose one in ${where}.`,
    });
    return null;
  }
  return collection;
}

function findField(
  available: Field[],
  collectionLabel: string,
  spec: FieldSpec,
  bound: string | null | undefined,
  issues: SchemaIssue[],
  collectionRequired: boolean,
  where: string
): Field | null {
  const blocking = collectionRequired && Boolean(spec.required);
  const slot = `${collectionLabel} → ${spec.name}`;
  const issue = (kind: SchemaIssue['kind'], message: string) =>
    issues.push({ kind, blocking, collection: collectionLabel, field: spec.name, message });

  if (bound === null) {
    issue('not-used', `"${slot}" is set to "Not used" in the app's settings.`);
    return null;
  }
  const pin = pinFor(bound, spec.id);
  if (!pin) {
    issue('not-set', `No field is set for "${slot}" yet. Choose one in ${where}.`);
    return null;
  }
  const field = available.find((f) => f.id === pin.id);
  if (!field) {
    issue(
      'not-found',
      pin.source === 'bindings'
        ? `The field set for "${slot}" in ${where} no longer exists. Choose another.`
        : `No field on this collection has the id pinned for "${slot}" (${pin.id}). Choose one in ${where}.`
    );
    return null;
  }
  // The type is held whoever chose the field: a value the app writes as a
  // DATETIME must land in one.
  const types = typesOf(spec);
  if (types && !types.includes(field.type)) {
    issue('wrong-type', `"${slot}" is set to "${field.name}", a ${field.type} field; this app expects ${types.join(' or ')}.`);
    return null;
  }
  return field;
}

/**
 * The options of a resolved select field that the spec lists, by option key:
 * the option Teambridge bound, else the one option with the spec's name. The
 * app's own setup page has no picker for options, so a name is how an
 * account that Teambridge holds nothing for finds them. Unresolved options
 * are reported like their field, and block when it does.
 */
function findOptions(
  field: Field,
  collectionLabel: string,
  spec: FieldSpec,
  bound: { [optionKey: string]: string } | undefined,
  issues: SchemaIssue[],
  collectionRequired: boolean,
  where: string
): Record<string, SelectOption | null> {
  const blocking = collectionRequired && Boolean(spec.required);
  const available = field.selectOptions ?? [];
  const resolved: Record<string, SelectOption | null> = {};
  for (const label of spec.options ?? []) {
    const key = optionKey(label);
    const boundId = bound?.[key];
    const option = boundId
      ? (available.find((candidate) => candidate.id === boundId) ?? null)
      : uniqueByName(available, label);
    resolved[key] = option;
    if (!option) {
      const slot = `${collectionLabel} → ${spec.name} → ${label}`;
      issues.push({
        kind: boundId ? 'not-found' : 'not-set',
        blocking,
        collection: collectionLabel,
        field: spec.name,
        option: label,
        message: boundId
          ? `The option set for "${slot}" in ${where} no longer exists. Choose another.`
          : `"${field.name}" has no option called "${label}". Add it, or choose one in ${where}.`,
      });
    }
  }
  return resolved;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The one item named `name`, or null when none or several are: an ambiguous name is not guessed. */
function uniqueByName<T extends { name: string }>(items: T[], name: string): T | null {
  const matches = items.filter((item) => same(item.name, name));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * The collection a good-faith guess picks for `spec`: its pinned id when the
 * account has it, else the one collection with the same name.
 */
export function matchCollection(all: Collection[], spec: CollectionSpec): Collection | null {
  if (spec.id) {
    const byId = all.find((collection) => collection.id === spec.id);
    if (byId) return byId;
  }
  return uniqueByName(all, spec.name);
}

/**
 * The field a good-faith guess picks for each slot of `spec` among
 * `available`, keyed like `spec.fields`: the pinned id when it is there with
 * the right type, else the one field with the same name among those of the
 * slot's type. Null where nothing, or more than one, matches.
 */
export function matchFields<C extends CollectionSpec>(
  available: Field[],
  spec: C
): { [K in keyof C['fields']]: Field | null } {
  const matched: Record<string, Field | null> = {};
  for (const [key, fieldSpec] of Object.entries(spec.fields)) {
    const types = typesOf(fieldSpec);
    const ofType = available.filter((field) => !types || types.includes(field.type));
    const pinned = fieldSpec.id ? ofType.find((field) => field.id === fieldSpec.id) : undefined;
    matched[key] = pinned ?? uniqueByName(ofType, fieldSpec.name);
  }
  return matched as { [K in keyof C['fields']]: Field | null };
}

/**
 * A good-faith guess at an account's bindings, by name: the one place names
 * are matched. Every slot `existing` already covers — an id, or `null` for
 * "Not used" — is kept as it is; for the rest, the one collection or field
 * with the slot's name (and type) is bound, and a name that matches nothing
 * or several things is left unset for the admin.
 *
 * `resolveAccountSchema` runs it on first contact with an account and saves
 * the result, so an account whose collections carry the expected names works
 * without a visit to setup; the setup page runs it to prefill whatever is
 * still unset. Either way what is saved is ids, and from then on resolution
 * never looks at a name again.
 *
 * Pass a `structure` to share its reads with the resolution that follows
 * (see {@link AccountStructure}); without one it reads from `client`.
 */
export async function guessBindings<S extends SchemaSpec>(
  client: TBClient,
  spec: S,
  existing?: SchemaBindings | null,
  structure: AccountStructure = readAccountStructure(client)
): Promise<SchemaBindings> {
  const all = await structure.collections();
  const bindings: SchemaBindings = {};

  for (const [key, collectionSpec] of Object.entries(spec)) {
    const current = existing?.[key];
    const collectionId = current?.id !== undefined ? current.id : (matchCollection(all, collectionSpec)?.id ?? undefined);
    if (!collectionId) {
      // "Not used" stays; no guess stays unset.
      if (current) bindings[key] = current;
      continue;
    }

    const fields = { ...current?.fields };
    const unset = Object.keys(collectionSpec.fields).filter((fieldKey) => fields[fieldKey] === undefined);
    if (unset.length > 0) {
      const matched: Record<string, Field | null> = matchFields(await structure.fields(collectionId), collectionSpec);
      for (const fieldKey of unset) {
        const field = matched[fieldKey];
        if (field) fields[fieldKey] = field.id;
      }
    }
    bindings[key] = { id: collectionId, fields, ...(current?.options ? { options: current.options } : {}) };
  }
  return bindings;
}

/**
 * Encode a value for writing to `field`, following the field's
 * `writeFormatHint` and type. Throws for read-only fields, which the API
 * rejects (often as an unhelpful 500).
 *
 *  - `comma_separated_uuids` (multi link fields such as a user's Locations or
 *    Roles): a single string `"id1,id2"`. A one-element JSON array happens to
 *    work, so an array bug only shows up with two or more ids. Empty → `null`.
 *  - `single_uuid`: one id string.
 *  - DATETIME: an ISO string with a timezone (`…Z`). A bare
 *    `2026-06-01T09:00` from `<input type="datetime-local">` has none.
 */
export function toWriteValue(field: Field, value: unknown): unknown {
  if (field.readOnly) {
    throw new Error(`"${field.name}" is read-only in Teambridge and can't be written by an app.`);
  }
  if (value === undefined || value === null || value === '') return null;

  if (field.writeFormatHint === 'comma_separated_uuids') {
    const ids = readIds(value);
    return ids.length > 0 ? ids.join(',') : null;
  }
  if (field.writeFormatHint === 'single_uuid') {
    return readIds(value)[0] ?? null;
  }
  if (field.type === 'DATETIME') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error(`"${field.name}" needs a valid date and time.`);
    return date.toISOString();
  }
  return value;
}

/**
 * Read link / select values as a list of ids. Multi-selects and multi links
 * read back as JSON arrays, single ones as a bare string, and some as a
 * comma-joined string — handle all three or values silently resolve to nothing.
 */
export function readIds(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string' ? [item] : item && typeof item === 'object' && 'id' in item ? [String(item.id)] : []
    );
  }
  if (typeof value === 'string') return value.split(',').map((id) => id.trim()).filter(Boolean);
  if (typeof value === 'object' && 'id' in value) return [String((value as { id: unknown }).id)];
  return [];
}
