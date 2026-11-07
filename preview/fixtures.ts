import type { DataRecord } from '@/lib/teambridge/client/types';

// The ids pinned in every sample's app/schema.ts (the Implementation Tracker account), so the
// samples' own loaders read these records exactly as they read the real ones.
export const IDS = {
  shifts: '3474bfe1-8553-4d70-81cb-787373794600',
  users: '7704acc5-8e52-4095-88a3-5fce2fe0c8cf',
  locations: '1d7895fb-ee50-4eee-a71f-b08b12842803',
  roles: 'c22edaa3-a72b-429c-9822-d28c6221bff8',
  start: 'fbc850fb-dcdc-4500-a21e-f315725e252d',
  end: 'ddc0f76e-704c-40e6-99b7-86a481230441',
  clockIn: 'e30cf15c-30fa-43e0-84ab-9cffeb620a92',
  clockOut: 'e990993c-be2d-470f-933d-ca5249549641',
  assignee: '4499a8d9-3be3-4779-8e8a-759b25982970',
  location: '241293c5-4782-43ec-8b9e-b85ea8ec090a',
  roleIds: '0a7744db-d60a-4473-9304-6bb2ff3bb54c',
  hoursWorked: '098cb92c-dad1-4a22-8119-0a9450878de9',
  firstName: 'b82730c9-8861-44ac-8cfe-70963ab8aa84',
  lastName: '7ddf32fa-b9a5-4225-8ee1-08e14c7cccb2',
  locationName: '0e17a67a-63d6-4e1a-8f08-654149a889e1',
  roleName: '68149b59-7568-48d7-a159-1cd70efe5ca9',
  jobs: '3e0f33a8-9f70-49be-8bc8-a9ac413a3614',
  jobName: '3f115c23-9485-41e2-af3b-a8160de1b89f',
  jobLocation: 'ef847f6e-8750-499b-b26a-8d9f0b26c2c1',
  jobRoles: '0ed5f422-76b8-496d-b95e-7e8453b4423c',
  jobStart: 'c81b7397-fda8-4249-bc8e-600d711776f3',
  jobEnd: '18ce139a-2228-49d1-936d-4183b2d229ef',
  jobRate: '62441898-4360-4b69-9538-0157223f2d99',
  jobStatus: 'b991890e-2f68-4bd8-bd10-07339c7cfbb6',
  placements: 'ea5103ea-f947-451f-964a-6626e0a4d2c7',
  placementJob: '6246af91-e948-412d-be2c-0e1c1c95e1b1',
  placementAssignee: '9d8418c8-c673-4d97-a781-5f8c37020d40',
  placementStage: 'f372226d-b85a-4b59-80c4-98a809b417be',
};

const PEOPLE = [
  ['Maya', 'Chen'],
  ['Jordan', 'Ellis'],
  ['Priya', 'Nair'],
  ['Sam', 'Okafor'],
  ['Lena', 'Ortiz'],
  ['Theo', 'Brooks'],
].map(([first, last], i) => ({ id: `preview-user-${i + 1}`, first, last }));

const LOCATIONS = [
  { id: 'preview-location-north', name: 'North Clinic', startHour: 8 },
  { id: 'preview-location-riverside', name: 'Riverside', startHour: 9 },
  { id: 'preview-location-downtown', name: 'Downtown', startHour: 9 },
];

const ROLES = [
  { id: 'preview-role-coordinator', name: 'Coordinator' },
  { id: 'preview-role-technician', name: 'Technician' },
];

// A seeded generator, so a day looks the same on every load.
function random(seed: number): () => number {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = 45;
const DAYS_AHEAD = 45;

function buildShifts(now: Date): DataRecord[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shifts: DataRecord[] = [];
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset += 1) {
    const day = new Date(today.getTime() + offset * DAY_MS);
    const dayNumber = Math.round(day.getTime() / DAY_MS);
    const next = random(dayNumber * 7919);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const locations = isWeekend ? LOCATIONS.slice(0, 1) : LOCATIONS;
    locations.forEach((location, index) => {
      const start = new Date(day);
      start.setHours(location.startHour, 0, 0, 0);
      const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
      const person = PEOPLE[(dayNumber + index * 2) % PEOPLE.length];
      const role = ROLES[(dayNumber + index) % ROLES.length];
      const isPast = end.getTime() <= now.getTime();
      const isOpen = !isPast && next() < 0.18;
      const record: DataRecord = {
        id: `preview-shift-${dayNumber}-${index}`,
        [IDS.start]: start.toISOString(),
        [IDS.end]: end.toISOString(),
        [IDS.location]: location.id,
        [IDS.roleIds]: [role.id],
        [IDS.assignee]: isOpen ? null : person.id,
      };
      if (isPast) {
        const roll = next();
        const lateMinutes = roll < 0.12 ? 10 + Math.floor(next() * 25) : -Math.floor(next() * 6);
        const clockIn = new Date(start.getTime() + lateMinutes * 60_000);
        const missingOut = roll > 0.93;
        const clockOut = new Date(end.getTime() + Math.floor(next() * 8) * 60_000);
        record[IDS.clockIn] = roll > 0.985 ? null : clockIn.toISOString();
        record[IDS.clockOut] = missingOut || roll > 0.985 ? null : clockOut.toISOString();
        record[IDS.hoursWorked] = record[IDS.clockOut]
          ? Math.round(((clockOut.getTime() - clockIn.getTime()) / 3_600_000) * 4) / 4
          : null;
      }
      shifts.push(record);
    });
  }
  return shifts;
}

// [name, location index, role index, start in days from today, weeks, hourly rate, status, stages]
const JOB_ORDERS: [string, number, number, number, number, number, string, string[]][] = [
  ['Weekend front desk cover', 0, 0, 4, 6, 22, 'Open', ['Placed', 'Interviewing']],
  ['Imaging technician, nights', 1, 1, 9, 12, 31.5, 'Open', ['Submitted', 'Submitted', 'Withdrawn']],
  ['Patient intake coordinator', 2, 0, 2, 8, 24, 'Open', ['Placed']],
  ['Lab technician, mornings', 0, 1, 16, 10, 28, 'Open', []],
  ['Holiday surge coordinators', 1, 0, 23, 4, 25, 'Open', ['Interviewing', 'Submitted']],
  ['Float technician', 2, 1, 30, 16, 29, 'On hold', []],
  ['Front desk, Riverside', 1, 0, -20, 12, 21.5, 'Filled', ['Placed', 'Placed']],
  ['Sterile processing tech', 0, 1, -35, 8, 27, 'Filled', ['Placed']],
  ['Evening scheduler', 2, 0, -50, 6, 23, 'Closed', ['Withdrawn']],
];

function buildJobs(now: Date): { jobs: DataRecord[]; placements: DataRecord[] } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jobs: DataRecord[] = [];
  const placements: DataRecord[] = [];
  JOB_ORDERS.forEach(([name, location, role, startDays, weeks, rate, status, stages], i) => {
    const start = new Date(today.getTime() + startDays * DAY_MS);
    const id = `preview-job-${i + 1}`;
    jobs.push({
      id,
      [IDS.jobName]: name,
      [IDS.jobLocation]: LOCATIONS[location].id,
      [IDS.jobRoles]: [ROLES[role].id],
      [IDS.jobStart]: start.toISOString(),
      [IDS.jobEnd]: new Date(start.getTime() + weeks * 7 * DAY_MS).toISOString(),
      [IDS.jobRate]: rate,
      [IDS.jobStatus]: status,
    });
    stages.forEach((stage, j) => {
      placements.push({
        id: `${id}-placement-${j + 1}`,
        [IDS.placementJob]: id,
        [IDS.placementAssignee]: PEOPLE[(i * 2 + j) % PEOPLE.length].id,
        [IDS.placementStage]: stage,
      });
    });
  });
  return { jobs, placements };
}

/** Every record the preview serves, by collection id. Built once per page load, around today. */
export function buildFixtures(now: Date): Record<string, DataRecord[]> {
  const { jobs, placements } = buildJobs(now);
  return {
    [IDS.jobs]: jobs,
    [IDS.placements]: placements,
    [IDS.shifts]: buildShifts(now),
    [IDS.users]: PEOPLE.map((p) => ({ id: p.id, [IDS.firstName]: p.first, [IDS.lastName]: p.last })),
    [IDS.locations]: LOCATIONS.map((l) => ({ id: l.id, [IDS.locationName]: l.name })),
    [IDS.roles]: ROLES.map((r) => ({ id: r.id, [IDS.roleName]: r.name })),
  };
}

export const PREVIEW_USER = { id: 'preview-user-viewer', name: 'Alex Rivera', email: 'alex@example.com' };
