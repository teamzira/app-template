import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
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
 * Two stores ship behind one interface, and `configStore` picks one from the
 * environment the first time it is used:
 *
 *  - **Postgres** when `DATABASE_URL` is set — which the Neon integration
 *    does for every deployment made from the README's deploy button for
 *    several accounts. One table, one row per account, created on first use.
 *  - **Memory** otherwise. It is empty after every restart or deploy, and
 *    each server instance has its own copy, so it is only for development:
 *    a production build without `DATABASE_URL` (an app for one account needs
 *    none) hides Settings and resolves each account from the ids pinned in
 *    the spec, or else a guess by name (`settingsEnabled` in `./setup`), and
 *    the server log says so once.
 *
 * See AGENTS.md → "Per-account configuration" → "The config store".
 */
export interface AccountConfig {
  /** The account's choice of collections and fields for the spec's slots. */
  bindings?: SchemaBindings;
  /** When the config was last saved, ISO 8601. Shown on the settings page. */
  updatedAt?: string;
}

export interface ConfigStore {
  /**
   * Whether what is `set` survives a restart and is shared by every server
   * instance. The app offers Settings only on a store that persists (or in
   * development), because choices saved anywhere else are silently lost.
   */
  readonly persistent: boolean;
  /** The account's config, or null when it has never been saved (or was deleted on uninstall). */
  get(accountId: string): Promise<AccountConfig | null>;
  /** Replace the account's config. */
  set(accountId: string, config: AccountConfig): Promise<void>;
  /** Forget the account. Called from the uninstall hook. */
  delete(accountId: string): Promise<void>;
}

// Shared state lives on `globalThis`, not at module level. Next bundles each
// route on its own, so the setup action, the uninstall hook and the pages
// would otherwise each hold a separate copy of this module — a separate map
// for the memory store, a separate choice of store, a separate "table
// created" flag — and never see one another's writes; and dev-mode hot
// reloads re-evaluate this module, which would send every tester back to
// setup after each file save.
const MEMORY_STORE_KEY = '__tbMemoryConfigStore';
const CONFIG_STORE_KEY = '__tbConfigStore';
type WithStoreGlobals = typeof globalThis & {
  [MEMORY_STORE_KEY]?: Map<string, AccountConfig>;
  [CONFIG_STORE_KEY]?: ConfigStore;
};

/**
 * An in-memory `ConfigStore`. Development only: nothing survives a restart,
 * and instances don't share it.
 */
export function createMemoryConfigStore(): ConfigStore {
  const globals = globalThis as WithStoreGlobals;
  const entries = (globals[MEMORY_STORE_KEY] ??= new Map<string, AccountConfig>());
  return {
    persistent: false,
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
 * A `ConfigStore` on Postgres, through Neon's serverless driver: each call is
 * one HTTP request, so there is no connection pool to keep alive or exhaust
 * on Fluid Compute. One table, created the first time the store is used on
 * an instance (`CREATE TABLE IF NOT EXISTS`, so every instance and every
 * deploy can run it):
 *
 *   account_config(account_id text primary key, config jsonb not null, updated_at timestamptz not null)
 *
 * `set` is an upsert and `get` is null for an account with no row. Nothing
 * connects until the first call, so building without `DATABASE_URL` is fine.
 */
export function createPostgresConfigStore(connectionString: string): ConfigStore {
  let sql: NeonQueryFunction<false, false> | undefined;
  let ready: Promise<void> | undefined;

  const query = () => (sql ??= neon(connectionString));

  // Once per instance, and never a cached failure: if creating the table
  // fails (the database is unreachable, or two instances created it at the
  // same moment and one lost the race on the catalog), the next call tries
  // again instead of failing forever.
  const table = () => {
    ready ??= createTable(query()).catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
    return ready;
  };

  return {
    persistent: true,
    async get(accountId) {
      await table();
      const rows = await query()`SELECT config FROM account_config WHERE account_id = ${accountId}`;
      return rows.length > 0 ? (rows[0].config as AccountConfig) : null;
    },
    async set(accountId, config) {
      await table();
      await query()`
        INSERT INTO account_config (account_id, config, updated_at)
        VALUES (${accountId}, ${JSON.stringify(config)}::jsonb, now())
        ON CONFLICT (account_id) DO UPDATE SET config = EXCLUDED.config, updated_at = EXCLUDED.updated_at`;
    },
    async delete(accountId) {
      await table();
      await query()`DELETE FROM account_config WHERE account_id = ${accountId}`;
    },
  };
}

async function createTable(sql: NeonQueryFunction<false, false>): Promise<void> {
  const create = () => sql`
    CREATE TABLE IF NOT EXISTS account_config (
      account_id text PRIMARY KEY,
      config jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )`;
  try {
    await create();
  } catch {
    // Two instances running this at the same moment can collide on the
    // catalog's unique index even with IF NOT EXISTS; the table exists after
    // either of them, so one more try settles it (and a real failure throws).
    await create();
  }
}

/**
 * The store for this deployment, chosen once per instance from the
 * environment: Postgres when `DATABASE_URL` is set, else memory.
 */
function chooseConfigStore(): ConfigStore {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return createPostgresConfigStore(connectionString);
  // The condition under which `settingsEnabled()` in ./setup turns Settings
  // off: a production build with nowhere durable to save. An app for one
  // account runs this way on purpose, so it is a note, not a warning.
  if (process.env.NODE_ENV === 'production') {
    console.info(
      '[Teambridge] No DATABASE_URL, so Settings is hidden: each account resolves from the ids pinned in ' +
        'app/schema.ts, or else a guess by name. That suits an app for one account. For an app on several ' +
        'accounts, add the Neon integration to the Vercel project and redeploy, so each account can choose its ' +
        'own collections and fields in Settings.'
    );
  }
  return createMemoryConfigStore();
}

function selectedStore(): ConfigStore {
  const globals = globalThis as WithStoreGlobals;
  return (globals[CONFIG_STORE_KEY] ??= chooseConfigStore());
}

/**
 * The store the app uses. The setup page, the gate (`./setup`) and the
 * lifecycle hooks all go through this export. It decides between Postgres
 * and memory on its first call (see `chooseConfigStore`), not at import, so
 * importing it has no side effects and a build without `DATABASE_URL` is
 * fine. To use a different database, change `chooseConfigStore` and nothing
 * else; a store that keeps data durably says so with `persistent: true`.
 */
export const configStore: ConfigStore = {
  get persistent() {
    return selectedStore().persistent;
  },
  get: (accountId) => selectedStore().get(accountId),
  set: (accountId, config) => selectedStore().set(accountId, config),
  delete: (accountId) => selectedStore().delete(accountId),
};
