'use server';

import { getTBClient, getTBContext, resolveAccountSchema, TBApiError } from '@/lib/teambridge';
import { toWriteValue } from '@/lib/teambridge/schema';
import { schema } from '../schema';

export type NewJobOrder = {
  name: string;
  locationId: string;
  roleId: string | null;
  /** ISO strings with a timezone; the dialog converts the picked days in the browser. */
  start: string;
  end: string | null;
  hourlyRate: number | null;
};

export type CreateResult = { ok: true } | { ok: false; error: string };

/** Creates a job order as the current user, so Teambridge applies their permissions. */
export async function createJobOrder(input: NewJobOrder): Promise<CreateResult> {
  if (!input.name.trim() || !input.locationId || !input.start) {
    return { ok: false, error: 'Add a name, a location and a start date.' };
  }
  if (input.end && Date.parse(input.end) < Date.parse(input.start)) {
    return { ok: false, error: 'The end date has to be on or after the start date.' };
  }

  const ctx = await getTBContext();
  try {
    const resolved = await resolveAccountSchema(getTBClient({ accountId: ctx.accountId }), schema);
    const { jobs } = resolved.collections;
    const { name, location, start, end, roles, hourlyRate } = jobs.fields;
    if (!resolved.ready || !jobs.id || !name || !location || !start) {
      // Logged, not shown: people using the app can't change the account's setup from here.
      console.error('[createJobOrder] the schema is not ready', resolved.issues);
      return { ok: false, error: "Couldn't create the job order. Try again." };
    }

    const data: Record<string, unknown> = {
      [name.id]: toWriteValue(name, input.name.trim()),
      [location.id]: toWriteValue(location, input.locationId),
      [start.id]: toWriteValue(start, input.start),
    };
    if (end && input.end) data[end.id] = toWriteValue(end, input.end);
    if (roles && input.roleId) data[roles.id] = toWriteValue(roles, [input.roleId]);
    if (hourlyRate && input.hourlyRate !== null) data[hourlyRate.id] = toWriteValue(hourlyRate, input.hourlyRate);

    await getTBClient(ctx).collections.records.create(jobs.id, data);
    return { ok: true };
  } catch (e) {
    console.error('[createJobOrder]', e);
    if (e instanceof TBApiError && e.isNotInstalled) return { ok: false, error: "This app isn't installed on this account." };
    if (e instanceof TBApiError && e.status === 403) return { ok: false, error: "You don't have permission to create job orders." };
    return { ok: false, error: "Couldn't save the job order. Check the values and try again." };
  }
}
