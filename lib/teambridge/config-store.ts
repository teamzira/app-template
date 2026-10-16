import type { SchemaBindings } from './schema';

/**
 * Per-account configuration: what the app keeps for each account it is
 * installed on. The template stores the account's schema bindings here (the
 * choices made on the setup page, see `./setup`). Add the app's own settings
 * to `AccountConfig` as it grows; callers read and write the whole object.
 *
 * Every key is an account id. An app is installed on many accounts and one
 * deployment serves them all, so nothing in here is ever unscoped.
 *
 * The store is behind an interface so the implementation can change without
 * touching callers. The one shipped here is in memory: fine for development,
 * **not for production** — it is empty after every restart or deploy, and
 * each server instance has its own copy, so two instances would disagree. To
 * ship, implement `ConfigStore` against a database (one row per account:
 * `account_id` primary key, `config` JSON) and change the `configStore`
 * export below. See AGENTS.md → "Configuration" for a Postgres/Redis sketch.
 */
export interface AccountConfig {
  /** The account's choice of collections and fields for the spec's slots. */
  bindings?: SchemaBindings;
  /** When the config was last saved, ISO 8601. Shown on the settings page. */
  updatedAt?: string;
}

export interface ConfigStore {
  /** The account's config, or null when it has never been saved (or was deleted on uninstall). */
  get(accountId: string): Promise<AccountConfig | null>;
  /** Replace the account's config. */
  set(accountId: string, config: AccountConfig): Promise<void>;
  /** Forget the account. Called from the uninstall hook. */
  delete(accountId: string): Promise<void>;
}

// The map lives on `globalThis`, not at module level. Next bundles each route
// on its own, so the setup action, the uninstall hook and the pages would
// otherwise each hold a separate map and never see one another's writes; and
// dev-mode hot reloads re-evaluate this module, which would send every tester
// back to setup after each file save.
const MEMORY_STORE_KEY = '__tbMemoryConfigStore';
type WithMemoryStore = typeof globalThis & { [MEMORY_STORE_KEY]?: Map<string, AccountConfig> };

/**
 * An in-memory `ConfigStore`. Development only: nothing survives a restart,
 * and instances don't share it.
 */
export function createMemoryConfigStore(): ConfigStore {
  const globals = globalThis as WithMemoryStore;
  const entries = (globals[MEMORY_STORE_KEY] ??= new Map<string, AccountConfig>());
  return {
    async get(accountId) {
      const config = entries.get(accountId);
      return config ? structuredClone(config) : null;
    },
    async set(accountId, config) {
      entries.set(accountId, structuredClone(config));
    },
    async delete(accountId) {
      entries.delete(accountId);
    },
  };
}

/**
 * The store the app uses. Swap the implementation here — for example
 * `createPostgresConfigStore(sql)` — and nothing else changes: the setup page,
 * the gate (`./setup`) and the lifecycle hooks all go through this export.
 */
export const configStore: ConfigStore = createMemoryConfigStore();
