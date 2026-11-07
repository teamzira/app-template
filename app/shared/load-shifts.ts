import { unstable_rethrow } from 'next/navigation';
import {
  getAppCredentials,
  getTBClient,
  getTBContext,
  lookupNames,
  requireSetup,
  TBApiError,
  type Field,
} from '@/lib/teambridge';
import { readIds, type SchemaIssue } from '@/lib/teambridge/schema';
import { schema } from '../schema';
import { readHours, readTime, type Location, type Shift } from './types';

// A month of shifts on a small team stays well under this; a bigger schedule needs a location
// filter or a shorter range rather than a higher cap.
const MAX_PAGES = 6;

export type ShiftsResult =
  | { status: 'ok'; now: number; shifts: Shift[]; locations: Location[]; locationId: string | null; issues: SchemaIssue[] }
  | { status: 'error'; message: string; locations: Location[]; locationId: string | null };

type Range = { from: Date; to: Date; location?: string };

/**
 * Shifts starting in [from, to), at one location when `location` names one the user can see,
 * sorted by start. Read as the current user, so Teambridge applies their permissions.
 */
export async function loadShifts({ from, to, location }: Range): Promise<ShiftsResult> {
  if (!getAppCredentials()) {
    return {
      status: 'error',
      message: 'Set TB_CLIENT_ID and TB_CLIENT_SECRET in .env.local, then restart the dev server.',
      locations: [],
      locationId: null,
    };
  }
  let locations: Location[] = [];
  let locationId: string | null = null;
  try {
    const ctx = await getTBContext();
    const appClient = getTBClient({ accountId: ctx.accountId });
    const userClient = getTBClient(ctx);
    const resolved = await requireSetup(appClient, schema);
    const { shifts: slot, users, locations: locationsSlot, roles } = resolved.collections;
    const { start, end, assignee, location: locationField, clockIn, clockOut, roles: rolesField, hoursWorked } = slot.fields;
    const locationName = locationsSlot.fields.name;
    // Required slots are set past requireSetup; the types can't say so.
    if (!slot.id || !start || !end || !assignee || !locationField || !locationsSlot.id || !locationName) {
      throw new Error('Scheduling schema resolved without its required slots');
    }

    // An account schedules a handful of locations; one page holds them all.
    const locationPage = await userClient.collections.records.list(locationsSlot.id, { page: 0, pageSize: 50 });
    locations = locationPage.data
      .map((record) => ({ id: record.id, name: String(record[locationName.id] ?? 'Unnamed location') }))
      .sort((a, b) => a.name.localeCompare(b.name));
    locationId = locations.some((l) => l.id === location) ? (location ?? null) : null;

    const { data } = await userClient.collections.records.listAll(slot.id, {
      filters: {
        [`${start.id}_gte`]: from.toISOString(),
        [`${start.id}_lt`]: to.toISOString(),
        ...(locationId ? { [`${locationField.id}_is`]: locationId } : {}),
      },
      maxPages: MAX_PAGES,
    });

    const userNameFields = [users.fields.firstName, users.fields.lastName].filter((f): f is Field => Boolean(f));
    const roleNameFields = [roles.fields.name].filter((f): f is Field => Boolean(f));
    const [userNames, roleNames] = await Promise.all([
      users.id
        ? lookupNames(appClient, users.id, data.map((r) => readIds(r[assignee.id])[0]), { fields: userNameFields })
        : new Map<string, string>(),
      roles.id && rolesField
        ? lookupNames(appClient, roles.id, data.flatMap((r) => readIds(r[rolesField.id])), { fields: roleNameFields })
        : new Map<string, string>(),
    ]);
    const locationNames = new Map(locations.map((l) => [l.id, l.name]));

    const shifts = data
      .flatMap((record): Shift[] => {
        const startAt = readTime(record[start.id]);
        const endAt = readTime(record[end.id]);
        if (!startAt || !endAt) return [];
        const assigneeId = readIds(record[assignee.id])[0] ?? null;
        const shiftLocation = readIds(record[locationField.id])[0] ?? null;
        const roleId = rolesField ? (readIds(record[rolesField.id])[0] ?? null) : null;
        return [
          {
            id: record.id,
            start: startAt,
            end: endAt,
            clockIn: clockIn ? readTime(record[clockIn.id]) : null,
            clockOut: clockOut ? readTime(record[clockOut.id]) : null,
            assigneeId,
            assigneeName: assigneeId ? (userNames.get(assigneeId) ?? null) : null,
            locationName: shiftLocation ? (locationNames.get(shiftLocation) ?? null) : null,
            roleName: roleId ? (roleNames.get(roleId) ?? null) : null,
            hoursWorked: hoursWorked ? readHours(record[hoursWorked.id]) : null,
          },
        ];
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    return { status: 'ok', now: Date.now(), shifts, locations, locationId, issues: resolved.issues };
  } catch (e) {
    unstable_rethrow(e);
    console.error('[Scheduling] loading shifts', e);
    return {
      status: 'error',
      message:
        e instanceof TBApiError && e.isNotInstalled
          ? "This app isn't installed on this account. Install it from the App Library, then reload."
          : "Couldn't load shifts. Try again, and if it keeps happening check the app's installation.",
      locations,
      locationId,
    };
  }
}
