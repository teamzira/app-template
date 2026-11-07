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
import { isPlaced, readNumber, readText, type JobOrder, type Option, type Placement } from './types';

// A client's job orders from the last 60 days onward, a few hundred at most; more needs paging.
const MAX_PAGES = 4;
const LOOKBACK_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type JobOrdersData =
  | {
      status: 'ok';
      now: number;
      jobs: JobOrder[];
      placements: Placement[];
      locations: Option[];
      roles: Option[];
      locationId: string | null;
      issues: SchemaIssue[];
    }
  | { status: 'error'; message: string; locations: Option[]; roles: Option[]; locationId: string | null };

const names = (records: { id: string; [key: string]: unknown }[], field: Field | null) =>
  records
    .map((record) => ({ id: record.id, name: field ? (readText(record[field.id]) ?? 'Unnamed') : 'Unnamed' }))
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Job orders starting from two months back, at one location when `location` names one the user
 * can see, with their placements. Read as the current user, so Teambridge applies their
 * permissions.
 */
export async function loadJobOrders(location: string | undefined): Promise<JobOrdersData> {
  if (!getAppCredentials()) {
    return {
      status: 'error',
      message: 'Set TB_CLIENT_ID and TB_CLIENT_SECRET in .env.local, then restart the dev server.',
      locations: [],
      roles: [],
      locationId: null,
    };
  }
  let locations: Option[] = [];
  let roles: Option[] = [];
  let locationId: string | null = null;
  try {
    const ctx = await getTBContext();
    const appClient = getTBClient({ accountId: ctx.accountId });
    const userClient = getTBClient(ctx);
    const resolved = await requireSetup(appClient, schema);
    const { jobs: jobsSlot, placements: placementsSlot, users, locations: locationsSlot, roles: rolesSlot } =
      resolved.collections;
    const { name, location: locationField, start, end, roles: rolesField, status, hourlyRate } = jobsSlot.fields;
    // Required slots are set past requireSetup; the types can't say so.
    if (!jobsSlot.id || !name || !locationField || !start || !locationsSlot.id) {
      throw new Error('Job orders schema resolved without its required slots');
    }

    // A client has a handful of locations and roles; one page holds each.
    const [locationPage, rolePage] = await Promise.all([
      userClient.collections.records.list(locationsSlot.id, { page: 0, pageSize: 50 }),
      rolesSlot.id ? userClient.collections.records.list(rolesSlot.id, { page: 0, pageSize: 50 }) : null,
    ]);
    locations = names(locationPage.data, locationsSlot.fields.name);
    roles = names(rolePage?.data ?? [], rolesSlot.fields.name);
    locationId = locations.some((l) => l.id === location) ? (location ?? null) : null;

    const now = Date.now();
    const { job, assignee, stage } = placementsSlot.fields;
    const [jobRecords, placementRecords] = await Promise.all([
      userClient.collections.records.listAll(jobsSlot.id, {
        filters: {
          [`${start.id}_gte`]: new Date(now - LOOKBACK_DAYS * DAY_MS).toISOString(),
          ...(locationId ? { [`${locationField.id}_is`]: locationId } : {}),
        },
        maxPages: MAX_PAGES,
      }),
      placementsSlot.id && job
        ? userClient.collections.records.listAll(placementsSlot.id, { maxPages: MAX_PAGES })
        : null,
    ]);

    const locationNames = new Map(locations.map((l) => [l.id, l.name]));
    const roleNames = new Map(roles.map((r) => [r.id, r.name]));
    const jobsById = new Map(jobRecords.data.map((record) => [record.id, record]));
    const jobIdOf = (record: { [key: string]: unknown }) => (job ? (readIds(record[job.id])[0] ?? '') : '');
    // Only placements on the job orders shown, so a location filter narrows both lists.
    const placementRows = (placementRecords?.data ?? []).filter((record) => jobsById.has(jobIdOf(record)));
    const userNameFields = [users.fields.firstName, users.fields.lastName].filter((f): f is Field => Boolean(f));
    const workerNames =
      users.id && assignee
        ? await lookupNames(appClient, users.id, placementRows.map((r) => readIds(r[assignee.id])[0]), {
            fields: userNameFields,
          })
        : new Map<string, string>();

    const placements: Placement[] = placementRows.map((record) => {
      const jobRecord = jobsById.get(jobIdOf(record));
      const workerId = assignee ? readIds(record[assignee.id])[0] : undefined;
      return {
        id: record.id,
        jobName: jobRecord ? readText(jobRecord[name.id]) : null,
        locationName: jobRecord ? (locationNames.get(readIds(jobRecord[locationField.id])[0] ?? '') ?? null) : null,
        workerName: workerId ? (workerNames.get(workerId) ?? null) : null,
        start: jobRecord ? readText(jobRecord[start.id]) : null,
        stage: stage ? readText(record[stage.id]) : null,
      };
    });

    const jobs: JobOrder[] = jobRecords.data
      .flatMap((record): JobOrder[] => {
        const startAt = readText(record[start.id]);
        if (!startAt) return [];
        const onJob = placementRows.filter((p) => jobIdOf(p) === record.id);
        const placed = onJob.filter((p) => isPlaced(stage ? readText(p[stage.id]) : null)).length;
        return [
          {
            id: record.id,
            name: readText(record[name.id]) ?? 'Untitled job order',
            locationName: locationNames.get(readIds(record[locationField.id])[0] ?? '') ?? null,
            roleName: rolesField ? (roleNames.get(readIds(record[rolesField.id])[0] ?? '') ?? null) : null,
            start: startAt,
            end: end ? readText(record[end.id]) : null,
            hourlyRate: hourlyRate ? readNumber(record[hourlyRate.id]) : null,
            status: status ? readText(record[status.id]) : null,
            placed,
            inProgress: onJob.length - placed,
          },
        ];
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    return { status: 'ok', now, jobs, placements, locations, roles, locationId, issues: resolved.issues };
  } catch (e) {
    unstable_rethrow(e);
    console.error('[JobOrders] loading', e);
    return {
      status: 'error',
      message:
        e instanceof TBApiError && e.isNotInstalled
          ? "This app isn't installed on this account. Install it from the App Library, then reload."
          : "Couldn't load job orders. Try again, and if it keeps happening check the app's installation.",
      locations,
      roles,
      locationId,
    };
  }
}
