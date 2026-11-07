'use server';

import { getTBClient, getTBContext, resolveAccountSchema, TBApiError } from '@/lib/teambridge';
import { toWriteValue } from '@/lib/teambridge/schema';
import { schema } from '../schema';

export type ShiftRequest = {
  locationId: string;
  roleId: string | null;
  /** ISO strings with a timezone; the dialog converts the picked times in the browser. */
  start: string;
  end: string;
};

export type RequestResult = { ok: true } | { ok: false; error: string };

/**
 * Adds an open shift (no one assigned, not published) for the staffing team to fill. Written as
 * the current user, so Teambridge applies their permissions.
 */
export async function requestShift(input: ShiftRequest): Promise<RequestResult> {
  if (!input.locationId || !input.start || !input.end) {
    return { ok: false, error: 'Choose a location, a start and an end.' };
  }
  if (Date.parse(input.end) <= Date.parse(input.start)) {
    return { ok: false, error: 'The shift has to end after it starts.' };
  }

  const ctx = await getTBContext();
  try {
    const resolved = await resolveAccountSchema(getTBClient({ accountId: ctx.accountId }), schema);
    const { shifts } = resolved.collections;
    const { start, end, location, roles } = shifts.fields;
    if (!resolved.ready || !shifts.id || !start || !end || !location) {
      // Logged, not shown: people using the app can't change the account's setup from here.
      console.error('[requestShift] the schema is not ready', resolved.issues);
      return { ok: false, error: "Couldn't send the request. Try again." };
    }

    const data: Record<string, unknown> = {
      [start.id]: toWriteValue(start, input.start),
      [end.id]: toWriteValue(end, input.end),
      [location.id]: toWriteValue(location, input.locationId),
    };
    if (roles && input.roleId) data[roles.id] = toWriteValue(roles, [input.roleId]);

    await getTBClient(ctx).collections.records.create(shifts.id, data);
    return { ok: true };
  } catch (e) {
    console.error('[requestShift]', e);
    if (e instanceof TBApiError && e.isNotInstalled) return { ok: false, error: "This app isn't installed on this account." };
    if (e instanceof TBApiError && e.status === 403) return { ok: false, error: "You don't have permission to request shifts." };
    return { ok: false, error: "Couldn't send the request. Check the times and try again." };
  }
}
