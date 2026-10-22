'use server';

/**
 * EXAMPLE CODE — replace or remove before building a real app. See AGENTS.md.
 */
import { getTBContext, getTBClient, resolveAccountSchema, TBApiError } from '@/lib/teambridge';
import { toWriteValue } from '@/lib/teambridge/schema';
import { schema } from './schema';

export async function createShift(formData: FormData) {
  // Already ISO strings with a timezone — the modal converts them in the browser.
  const startTime = formData.get('startTime') as string | null;
  const endTime = formData.get('endTime') as string | null;
  const assignee = (formData.get('assignee') as string | null)?.trim() || null;
  if (!startTime || !endTime) {
    return { error: 'Start time and end time are required.' };
  }

  if (new Date(endTime) <= new Date(startTime)) {
    return { error: 'End time must be after start time.' };
  }

  const ctx = await getTBContext();

  try {
    // Same resolution as the page: the account's bindings, if any, then names.
    const resolved = await resolveAccountSchema(getTBClient({ accountId: ctx.accountId }), schema);
    const shifts = resolved.collections.shifts;
    const { start, end, assignee: assigneeField } = shifts.fields;
    if (!resolved.ready || !shifts.id || !start || !end) {
      // Logged, not shown: people using the app can't do anything about the
      // account's setup from here.
      console.error('[createShift] the schema is not ready', resolved.issues);
      return { error: "Couldn't create the shift. Try again." };
    }

    // Write as the current user, so Teambridge applies their permissions.
    const client = getTBClient(ctx);
    const recordData: Record<string, unknown> = {
      [start.id]: toWriteValue(start, startTime),
      [end.id]: toWriteValue(end, endTime),
    };
    if (assignee && assigneeField && !assigneeField.readOnly) {
      recordData[assigneeField.id] = toWriteValue(assigneeField, assignee);
    }

    await client.collections.records.create(shifts.id, recordData);
    return { success: true };
  } catch (e) {
    // Log the full error for debugging; show the user something specific.
    console.error('[createShift]', e);
    if (e instanceof TBApiError && e.isNotInstalled) {
      return { error: "This app isn't installed on this account." };
    }
    if (e instanceof TBApiError && e.status === 403) {
      return { error: "You don't have permission to create shifts." };
    }
    return { error: "Couldn't save the shift. Check the values and try again." };
  }
}
