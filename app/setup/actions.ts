'use server';

import { getTBClient, getTBContext, TBApiError } from '@/lib/teambridge';
import { configStore } from '@/lib/teambridge/config-store';
import { invalidateSchema, resolveSchema, type SchemaBindings } from '@/lib/teambridge/schema';
import { schema } from '../schema';

/**
 * Save the admin's choices for this account. On success the form opens the
 * app; the action returns `{ ok: true }` rather than calling `redirect()`,
 * because inside Teambridge a redirect from a server action reloads the whole
 * iframe instead of navigating client-side.
 *
 * Validation is the resolver itself: the schema is resolved with the new
 * bindings, and any blocking issue — a required slot left unset, a field of
 * the wrong type, an id the account doesn't have — refuses the save with its
 * message. Non-blocking issues (an optional slot set to "Not used") go
 * through; the app degrades those features.
 */
export async function saveSetup(input: SchemaBindings): Promise<{ ok: true } | { error: string }> {
  const { accountId } = await getTBContext();
  // A server action is a public endpoint: keep only the spec's keys and
  // well-formed values, whatever arrived.
  const bindings = sanitizeBindings(input);

  try {
    // Resolve fresh, not from the cache: the admin may have just added the
    // field the cached result still reports as missing.
    invalidateSchema(accountId);
    const resolved = await resolveSchema(getTBClient({ accountId }), schema, { bindings });
    const blocking = resolved.issues.filter((issue) => issue.blocking);
    if (blocking.length > 0) {
      return { error: blocking.map((issue) => issue.message).join(' ') };
    }
    await configStore.set(accountId, { bindings, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[saveSetup]', e);
    return {
      error:
        e instanceof TBApiError && e.isNotInstalled
          ? "This app isn't installed on this account."
          : "Couldn't save these settings. Try again.",
    };
  }

  // The resolution above is now cached for these bindings, so the home page
  // the form navigates to renders from it.
  return { ok: true };
}

function sanitizeBindings(input: unknown): SchemaBindings {
  const bindings: SchemaBindings = {};
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  for (const [key, collectionSpec] of Object.entries(schema)) {
    const raw = source[key];
    if (!raw || typeof raw !== 'object') continue;
    const { id, fields } = raw as { id?: unknown; fields?: unknown };
    const binding: NonNullable<SchemaBindings[string]> = { fields: {} };
    if (id === null || (typeof id === 'string' && id)) binding.id = id;
    const rawFields = fields && typeof fields === 'object' ? (fields as Record<string, unknown>) : {};
    for (const fieldKey of Object.keys(collectionSpec.fields)) {
      const value = rawFields[fieldKey];
      if (value === null || (typeof value === 'string' && value)) binding.fields![fieldKey] = value;
    }
    bindings[key] = binding;
  }
  return bindings;
}
