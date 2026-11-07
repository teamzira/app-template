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
import { readHours, readTime, WINDOW_DAYS, type PortalLocation, type PortalShift } from './types';

// Four weeks of shifts on a small team stays well under this; a bigger client needs paging
// rather than a higher cap.
const MAX_PAGES = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PortalData =
  | { status: 'ok'; now: number; shifts: PortalShift[]; locations: PortalLocation[]; locationId: string | null; issues: SchemaIssue[] }
  | { status: 'error'; message: string; locations: PortalLocation[]; locationId: string | null };

/**
 * Shifts from two weeks back to two weeks ahead, at one location when `location` names one the
 * user can see. Read as the current user, so Teambridge applies their permissions.
 */
export async function loadPortal(location: string | undefined): Promise<PortalData> {
  if (!getAppCredentials()) {
    return { status: 'error', message: 'Set TB_CLIENT_ID and TB_CLIENT_SECRET in .env.local, then restart the dev server.', locations: [], locationId: null };
  }
  let locations: PortalLocation[] = [];
  let locationId: string | null = null;
  try {
    const ctx = await getTBContext();
    const appClient = getTBClient({ accountId: ctx.accountId });
    const userClient = getTBClient(ctx);
    const resolved = await requireSetup(appClient, schema);
    const { shifts: shiftsSlot, users, locations: locationsSlot, roles } = resolved.collections;
    const { start, end, assignee, location: locationField, roles: rolesField, hoursWorked } = shiftsSlot.fields;
    const locationName = locationsSlot.fields.name;
    // Required slots are set past requireSetup; the types can't say so.
    if (!shiftsSlot.id || !start || !end || !assignee || !locationField || !locationsSlot.id || !locationName) {
      throw new Error('Portal schema resolved without its required slots');
    }

    // A client sees a handful of locations; one page holds them all.
    const locationPage = await userClient.collections.records.list(locationsSlot.id, { page: 0, pageSize: 50 });
    locations = locationPage.data
      .map((record) => ({ id: record.id, name: String(record[locationName.id] ?? 'Unnamed location') }))
      .sort((a, b) => a.name.localeCompare(b.name));
    locationId = locations.some((l) => l.id === location) ? (location ?? null) : null;

    const now = Date.now();
    const { data } = await userClient.collections.records.listAll(shiftsSlot.id, {
      filters: {
        [`${start.id}_gte`]: new Date(now - WINDOW_DAYS * DAY_MS).toISOString(),
        [`${start.id}_lt`]: new Date(now + WINDOW_DAYS * DAY_MS).toISOString(),
        ...(locationId ? { [`${locationField.id}_is`]: locationId } : {}),
      },
      maxPages: MAX_PAGES,
    });

    const userNameFields = [users.fields.firstName, users.fields.lastName].filter((f): f is Field => Boolean(f));
    const roleNameFields = [roles.fields.name].filter((f): f is Field => Boolean(f));
    const assigneeIds = data.map((record) => readIds(record[assignee.id])[0]);
    const roleIds = rolesField ? data.flatMap((record) => readIds(record[rolesField.id])) : [];
    const [userNames, roleNames] = await Promise.all([
      users.id ? lookupNames(appClient, users.id, assigneeIds, { fields: userNameFields }) : new Map<string, string>(),
      roles.id && rolesField ? lookupNames(appClient, roles.id, roleIds, { fields: roleNameFields }) : new Map<string, string>(),
    ]);
    const locationNames = new Map(locations.map((l) => [l.id, l.name]));

    const shifts = data
      .flatMap((record): PortalShift[] => {
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
            assigneeId,
            assigneeName: assigneeId ? (userNames.get(assigneeId) ?? null) : null,
            locationName: shiftLocation ? (locationNames.get(shiftLocation) ?? null) : null,
            roleName: roleId ? (roleNames.get(roleId) ?? null) : null,
            hoursWorked: hoursWorked ? readHours(record[hoursWorked.id]) : null,
          },
        ];
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    return { status: 'ok', now, shifts, locations, locationId, issues: resolved.issues };
  } catch (e) {
    unstable_rethrow(e);
    console.error('[Portal] loading shifts', e);
    return {
      status: 'error',
      message:
        e instanceof TBApiError && e.isNotInstalled
          ? "This app isn't installed on this account. Install it from the App Library, then reload."
          : "Couldn't load the schedule. Try again, and if it keeps happening check the app's installation.",
      locations,
      locationId,
    };
  }
}
