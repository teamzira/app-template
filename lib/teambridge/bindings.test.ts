import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TBClient } from './client/TBClient';
import { forgetTeambridgeBindings, loadTeambridgeBindings, mergeBindings, optionKey } from './bindings';
import { defineSchema } from './schema';

const spec = defineSchema({
  shifts: {
    name: 'Shifts',
    fields: {
      start: { name: 'Start Time', type: 'DATETIME', required: true },
      status: { name: 'Status', type: 'SINGLE_SELECT', options: ['Open', 'Expiring soon'] },
      published: { name: 'Published', type: 'BOOLEAN' },
    },
  },
  users: {
    name: 'Users',
    standard: 'user',
    required: false,
    fields: { firstName: { name: 'First Name', type: 'TEXT' } },
  },
});

describe('optionKey', () => {
  it('matches the manifest builder', () => {
    assert.equal(optionKey('Expiring soon'), 'expiring_soon');
    assert.equal(optionKey('  Open!  '), 'open');
  });
});

describe('mergeBindings', () => {
  it("maps Teambridge's requirement keys onto collections, fields and options", () => {
    const merged = mergeBindings(
      spec,
      {
        shifts: 'c-shifts',
        'shifts.start': 'f-start',
        'shifts.status': 'f-status',
        'shifts.status.open': 'o-open',
        'shifts.status.expiring_soon': 'o-soon',
        users: 'c-users',
      },
      null
    );
    assert.deepEqual(merged, {
      shifts: {
        id: 'c-shifts',
        fields: { start: 'f-start', status: 'f-status' },
        options: { status: { open: 'o-open', expiring_soon: 'o-soon' } },
      },
      users: { id: 'c-users', fields: {} },
    });
  });

  it("lets Teambridge win per key and the app's saved bindings fill the rest", () => {
    const merged = mergeBindings(
      spec,
      { shifts: 'c-shifts', 'shifts.start': 'f-start-tb' },
      {
        shifts: { id: 'c-shifts', fields: { start: 'f-start-app', published: null, status: 'f-status-app' } },
        users: { id: null },
      }
    );
    assert.deepEqual(merged, {
      shifts: { id: 'c-shifts', fields: { start: 'f-start-tb', status: 'f-status-app', published: null } },
      users: { id: null, fields: {} },
    });
  });

  it('drops saved field choices when Teambridge bound the collection to another one', () => {
    const merged = mergeBindings(
      spec,
      { shifts: 'c-rota', 'shifts.start': 'f-rota-start' },
      { shifts: { id: 'c-shifts', fields: { start: 'f-start', published: 'f-published' } } }
    );
    assert.deepEqual(merged.shifts, { id: 'c-rota', fields: { start: 'f-rota-start' } });
  });

  it('takes options only from Teambridge, and only with the field they belong to', () => {
    const merged = mergeBindings(
      spec,
      { shifts: 'c-shifts', 'shifts.status.open': 'o-open' },
      { shifts: { id: 'c-shifts', fields: { status: 'f-status-app' } } }
    );
    assert.deepEqual(merged.shifts, { id: 'c-shifts', fields: { status: 'f-status-app' } });
  });

  it('binds std.<kind> to the standard collection the spec declares, unless its own key is held', () => {
    assert.equal(mergeBindings(spec, { 'std.user': 'c-users' }, null).users?.id, 'c-users');
    assert.equal(mergeBindings(spec, { 'std.user': 'c-std', users: 'c-users' }, null).users?.id, 'c-users');
    assert.equal(mergeBindings(spec, { 'std.location': 'c-loc' }, null).users, undefined);
  });

  it('ignores keys the spec does not have, and is the saved bindings when Teambridge holds none', () => {
    const saved = { shifts: { id: 'c-shifts', fields: { start: 'f-start' } } };
    assert.deepEqual(mergeBindings(spec, { 'shifts.renamed': 'x', other: 'y', '': 'z' }, saved), saved);
    assert.deepEqual(mergeBindings(spec, {}, saved), saved);
    assert.deepEqual(mergeBindings(spec, null, null), {});
  });
});

describe('loadTeambridgeBindings', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    forgetTeambridgeBindings('acct-1');
  });

  /** A real TBClient whose HTTP answers come from `answer`; the token endpoint always succeeds. */
  function clientAnswering(answer: () => Response) {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/oauth/token')) {
        return Response.json({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
      }
      calls.push(url);
      return answer();
    }) as typeof fetch;
    const client = new TBClient({ clientId: 'id', clientSecret: 'secret', accountId: 'acct-1' });
    return { client, calls };
  }

  it('unwraps the data envelope and caches per account', async () => {
    const { client, calls } = clientAnswering(() =>
      Response.json({ data: { slug: 'shifts-dashboard', bindings: { shifts: 'c-shifts', bad: 3 } } })
    );
    const first = await loadTeambridgeBindings(client);
    assert.deepEqual(first, { slug: 'shifts-dashboard', bindings: { shifts: 'c-shifts' } });
    await loadTeambridgeBindings(client);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith('/v1/apps/self/bindings'));
  });

  it('reads again for a newer setup stamp', async () => {
    const { client, calls } = clientAnswering(() => Response.json({ data: { slug: 's', bindings: {} } }));
    await loadTeambridgeBindings(client, '2026-11-01T00:00:00Z');
    await loadTeambridgeBindings(client, '2026-11-02T00:00:00Z');
    assert.equal(calls.length, 2);
  });

  it('answers a 404 (not a registered app) as no bindings', async () => {
    const { client } = clientAnswering(() => new Response('{"error":{"code":"NOT_FOUND"}}', { status: 404 }));
    assert.deepEqual(await loadTeambridgeBindings(client), { slug: null, bindings: {} });
  });

  it('answers any other failure as no bindings, without caching it', async () => {
    let status = 500;
    const { client, calls } = clientAnswering(() =>
      status === 500 ? new Response('boom', { status }) : Response.json({ data: { slug: 's', bindings: { shifts: 'c' } } })
    );
    const warn = console.warn;
    console.warn = () => {};
    try {
      assert.deepEqual(await loadTeambridgeBindings(client), { slug: null, bindings: {} });
    } finally {
      console.warn = warn;
    }
    status = 200;
    assert.deepEqual(await loadTeambridgeBindings(client), { slug: 's', bindings: { shifts: 'c' } });
    assert.equal(calls.length, 2);
  });
});
