import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TBClient } from './client/TBClient';
import type { AppBindings, Collection, Field } from './client/types';
import { configStore } from './config-store';
import { defineSchema, invalidateSchema } from './schema';
import { recordTeambridgeSetup, resolveAccountSchema, setupPathFor, SETUP_PATH } from './setup';

/**
 * The account-level flow with a fake client: the memory config store (no
 * DATABASE_URL), and `NODE_ENV` switched to see both Settings modes. This is
 * what dev mode (`TB_DEV_MODE=true`) runs: a client Teambridge doesn't know
 * as a registered app gets a 404 from the bindings read, which answers as no
 * bindings.
 */

const ACCOUNT = 'acct-setup-test';

const spec = defineSchema({
  shifts: {
    name: 'Shifts',
    fields: {
      start: { name: 'Start Time', type: 'DATETIME', required: true },
      status: { name: 'Status', type: 'SINGLE_SELECT', options: ['Open', 'Filled'] },
    },
  },
});

const collections: Collection[] = [
  { id: 'c-shifts', name: 'Shifts' },
  { id: 'c-rota', name: 'Rota' },
];
const fields: Record<string, Field[]> = {
  'c-shifts': [
    { id: 'f-start', name: 'Start Time', type: 'DATETIME', required: false },
    {
      id: 'f-status',
      name: 'Status',
      type: 'SINGLE_SELECT',
      required: false,
      selectOptions: [
        { id: 'o-open', name: 'Open' },
        { id: 'o-filled', name: 'Filled' },
      ],
    },
  ],
  'c-rota': [
    { id: 'f-begins', name: 'Begins', type: 'DATETIME', required: false },
    {
      id: 'f-state',
      name: 'State',
      type: 'SINGLE_SELECT',
      required: false,
      selectOptions: [
        { id: 'o-available', name: 'Available' },
        { id: 'o-taken', name: 'Taken' },
      ],
    },
  ],
};

function fakeClient(teambridge: AppBindings): TBClient {
  return {
    accountId: ACCOUNT,
    collections: {
      list: async () => collections,
      getFields: async (id: string) => fields[id] ?? [],
    },
    apps: { getBindings: async () => teambridge },
  } as unknown as TBClient;
}

const env = process.env as Record<string, string | undefined>;
const nodeEnv = env.NODE_ENV;

describe('resolveAccountSchema', () => {
  beforeEach(async () => {
    env.NODE_ENV = 'development';
    await configStore.delete(ACCOUNT);
    invalidateSchema(ACCOUNT);
  });
  afterEach(() => {
    env.NODE_ENV = nodeEnv;
  });

  it('with no Teambridge bindings (dev mode), guesses by name on first contact and saves it', async () => {
    const resolved = await resolveAccountSchema(fakeClient({ slug: null, bindings: {} }), spec);
    assert.equal(resolved.ready, true);
    assert.equal(resolved.teambridgeSlug, null);
    assert.equal(resolved.collections.shifts.fields.start?.id, 'f-start');
    assert.deepEqual(resolved.collections.shifts.options.status, {
      open: { id: 'o-open', name: 'Open' },
      filled: { id: 'o-filled', name: 'Filled' },
    });
    assert.equal(setupPathFor(resolved), undefined);
    const saved = await configStore.get(ACCOUNT);
    assert.deepEqual(saved?.bindings, { shifts: { id: 'c-shifts', fields: { start: 'f-start', status: 'f-status' } } });
  });

  it("resolves from Teambridge's bindings over names, and saves only what it guessed", async () => {
    const client = fakeClient({
      slug: 'shifts-dashboard',
      bindings: {
        shifts: 'c-rota',
        'shifts.start': 'f-begins',
        'shifts.status': 'f-state',
        'shifts.status.open': 'o-available',
      },
    });
    const resolved = await resolveAccountSchema(client, spec);
    assert.equal(resolved.teambridgeSlug, 'shifts-dashboard');
    assert.equal(resolved.collections.shifts.id, 'c-rota');
    assert.equal(resolved.collections.shifts.fields.start?.id, 'f-begins');
    assert.deepEqual(resolved.collections.shifts.options.status?.open, { id: 'o-available', name: 'Available' });
    // "Filled" wasn't bound and no option has that name: reported, pointing at Teambridge.
    assert.equal(resolved.collections.shifts.options.status?.filled, null);
    assert.deepEqual(
      resolved.issues.map((issue) => [issue.kind, issue.option, issue.blocking]),
      [['not-set', 'Filled', false]]
    );
    assert.match(resolved.issues[0].message, /the app's setup in Teambridge/);
    assert.equal(resolved.ready, true);
    const saved = await configStore.get(ACCOUNT);
    assert.deepEqual(saved?.bindings, { shifts: { id: 'c-rota', fields: {} } });
  });

  it("sends an unready account whose bindings Teambridge holds to setup, even without Settings", async () => {
    env.NODE_ENV = 'production'; // memory store in production: no Settings
    const client = fakeClient({ slug: 'shifts-dashboard', bindings: { shifts: 'c-rota' } });
    const resolved = await resolveAccountSchema(client, spec);
    assert.equal(resolved.ready, false); // "Start Time" isn't on Rota, and Teambridge holds no field for it
    assert.equal(setupPathFor(resolved), SETUP_PATH);
    assert.match(resolved.issues[0].message, /the app's setup in Teambridge/);

    // Without bindings in Teambridge there is no setup to send anyone to.
    assert.equal(setupPathFor({ ready: false, teambridgeSlug: null }), undefined);
    env.NODE_ENV = 'development';
    assert.equal(setupPathFor({ ready: false, teambridgeSlug: null }), SETUP_PATH);
  });

  it('rereads Teambridge after the install hook records a review', async () => {
    let teambridge: AppBindings = { slug: null, bindings: {} };
    const client = {
      ...fakeClient(teambridge),
      apps: { getBindings: async () => teambridge },
    } as unknown as TBClient;
    assert.equal((await resolveAccountSchema(client, spec)).teambridgeSlug, null);

    teambridge = { slug: 'shifts-dashboard', bindings: { shifts: 'c-shifts', 'shifts.start': 'f-start' } };
    await recordTeambridgeSetup(ACCOUNT, 'abc123');
    const resolved = await resolveAccountSchema(client, spec);
    assert.equal(resolved.teambridgeSlug, 'shifts-dashboard');
    assert.equal((await configStore.get(ACCOUNT))?.teambridgeSetup?.manifestVersion, 'abc123');
    // The first-contact bindings survive the record.
    assert.ok((await configStore.get(ACCOUNT))?.bindings);
  });
});
