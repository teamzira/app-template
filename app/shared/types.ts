export const DAY_MS = 24 * 60 * 60 * 1000;

/** Days back the reports cover. */
export const REPORT_DAYS = 14;

// Teambridge has no "late" field on a shift, so the sample draws the line here. An account's own
// rule (grace period, rounding) belongs in a field or a workflow, not in this constant.
export const LATE_AFTER_MINUTES = 5;

export interface Location {
  id: string;
  name: string;
}

/** One shift, as every page shows it. Times are ISO strings, formatted in the browser. */
export interface Shift {
  id: string;
  start: string;
  end: string;
  clockIn: string | null;
  clockOut: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  locationName: string | null;
  roleName: string | null;
  hoursWorked: number | null;
}

/** Hours Worked arrives as a number of hours; anything else reads as unknown rather than zero. */
export function readHours(value: unknown): number | null {
  const hours = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(hours) ? hours : null;
}

export function readTime(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`;
}
