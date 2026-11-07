import { unstable_rethrow } from 'next/navigation';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
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
import { AppPage } from '@/components/app-shell/page';
import { schema } from './schema';
import { getFlag, PERIOD_DAYS, readHours, readTime, type TimesheetRow } from './timesheet';
import { TimesheetView } from './timesheet-view';

// 14 days of shifts on a small team stays well under this; a larger account needs a location
// filter or paging rather than a higher cap.
const MAX_PAGES = 4;

type Loaded = { rows: TimesheetRow[]; issues: SchemaIssue[] } | { error: string };

async function loadTimesheet(): Promise<Loaded> {
  const ctx = await getTBContext();
  const { accountId } = ctx;
  const appClient = getTBClient({ accountId });
  const resolved = await requireSetup(appClient, schema);
  const { shifts, users, locations } = resolved.collections;
  const { start, end, clockIn, clockOut, assignee, location, hoursWorked } = shifts.fields;
  // Required slots are set past requireSetup; the types can't say so.
  if (!shifts.id || !start || !end || !clockIn || !clockOut) {
    throw new Error('Timesheet schema resolved without its required slots');
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
  // Read as the current user, so Teambridge only returns the shifts they may see.
  const { data } = await getTBClient(ctx).collections.records.listAll(shifts.id, {
    filters: { [`${start.id}_gte`]: periodStart.toISOString(), [`${start.id}_lt`]: now.toISOString() },
    maxPages: MAX_PAGES,
  });

  const assigneeIds = assignee ? data.map((record) => readIds(record[assignee.id])[0]) : [];
  const locationIds = location ? data.map((record) => readIds(record[location.id])[0]) : [];
  const userNameFields = [users.fields.firstName, users.fields.lastName].filter((f): f is Field => Boolean(f));
  const locationNameFields = [locations.fields.name].filter((f): f is Field => Boolean(f));
  const [userNames, locationNames] = await Promise.all([
    users.id ? lookupNames(appClient, users.id, assigneeIds, { fields: userNameFields }) : new Map<string, string>(),
    locations.id
      ? lookupNames(appClient, locations.id, locationIds, { fields: locationNameFields })
      : new Map<string, string>(),
  ]);

  const rows = data
    .flatMap((record): TimesheetRow[] => {
      const startAt = readTime(record[start.id]);
      const endAt = readTime(record[end.id]);
      if (!startAt || !endAt) return [];
      const assigneeId = assignee ? (readIds(record[assignee.id])[0] ?? null) : null;
      const locationId = location ? (readIds(record[location.id])[0] ?? null) : null;
      const inAt = readTime(record[clockIn.id]);
      const outAt = readTime(record[clockOut.id]);
      return [
        {
          id: record.id,
          assigneeId,
          assigneeName: assigneeId ? (userNames.get(assigneeId) ?? null) : null,
          locationName: locationId ? (locationNames.get(locationId) ?? null) : null,
          start: startAt,
          end: endAt,
          clockIn: inAt,
          clockOut: outAt,
          hoursWorked: hoursWorked ? readHours(record[hoursWorked.id]) : null,
          flag: getFlag(startAt, inAt, outAt),
        },
      ];
    })
    // Only shifts that have ended belong on a timesheet; one in progress has no clock-out yet.
    .filter((row) => Date.parse(row.end) <= now.getTime())
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));

  return { rows, issues: resolved.issues };
}

async function load(): Promise<Loaded> {
  try {
    return await loadTimesheet();
  } catch (e) {
    unstable_rethrow(e);
    console.error('[Timesheet] loading shifts', e);
    return {
      error:
        e instanceof TBApiError && e.isNotInstalled
          ? "This app isn't installed on this account. Install it from the App Library, then reload."
          : "Couldn't load timesheets. Try again, and if it keeps happening check the app's installation.",
    };
  }
}

export default async function TimesheetPage() {
  const { user } = await getTBContext();
  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const description = `Worked shifts from the last ${PERIOD_DAYS} days.`;

  if (!getAppCredentials()) {
    return (
      <AppPage title="Timesheets" description={description}>
        <AlloyAlert variant="warning" title="App credentials missing">
          Set TB_CLIENT_ID and TB_CLIENT_SECRET in .env.local, then restart the dev server.
        </AlloyAlert>
      </AppPage>
    );
  }

  const loaded = await load();
  if ('error' in loaded) {
    return (
      <AppPage title="Timesheets" description={description}>
        <AlloyAlert variant="error" title="Couldn't load timesheets">
          {loaded.error}
        </AlloyAlert>
      </AppPage>
    );
  }

  return <TimesheetView rows={loaded.rows} issues={loaded.issues} firstName={firstName} />;
}
