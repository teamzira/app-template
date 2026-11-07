import { TagStatus } from '@teamzira/alloy/components/tags/interface';

/** One worked or missed shift, as the page shows it. Times are ISO strings, formatted in the browser. */
export interface TimesheetRow {
  id: string;
  assigneeId: string | null;
  assigneeName: string | null;
  locationName: string | null;
  start: string;
  end: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  flag: TimesheetFlag;
}

export type TimesheetFlag = 'not-clocked-in' | 'missing-clock-out' | 'late' | 'on-time';

/** The period the page covers: the last 14 days up to now. */
export const PERIOD_DAYS = 14;

// Teambridge has no "late" field on a shift, so the sample draws the line here. An account's own
// rule (grace period, rounding) belongs in a field or a workflow, not in this constant.
export const LATE_AFTER_MINUTES = 5;

export const FLAG_STATUS: Record<TimesheetFlag, { label: string; status: TagStatus }> = {
  'not-clocked-in': { label: 'No clock-in', status: TagStatus.NEGATIVE },
  'missing-clock-out': { label: 'No clock-out', status: TagStatus.NEGATIVE },
  late: { label: 'Late', status: TagStatus.WARNING },
  'on-time': { label: 'On time', status: TagStatus.POSITIVE },
};

export function getFlag(start: string, clockIn: string | null, clockOut: string | null): TimesheetFlag {
  if (!clockIn) return 'not-clocked-in';
  if (!clockOut) return 'missing-clock-out';
  const minutesLate = (Date.parse(clockIn) - Date.parse(start)) / 60_000;
  return minutesLate > LATE_AFTER_MINUTES ? 'late' : 'on-time';
}

/** Hours Worked arrives as a number of hours; anything else reads as unknown rather than zero. */
export function readHours(value: unknown): number | null {
  const hours = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(hours) ? hours : null;
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`;
}

export function readTime(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}
