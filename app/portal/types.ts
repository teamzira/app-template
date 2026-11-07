/** Days the portal reads either side of now: two weeks worked, two weeks scheduled. */
export const WINDOW_DAYS = 14;

/** Days ahead the overview counts as "coming up". */
export const UPCOMING_DAYS = 7;

export interface PortalLocation {
  id: string;
  name: string;
}

/** One shift, as every tab shows it. Times are ISO strings, formatted in the browser. */
export interface PortalShift {
  id: string;
  start: string;
  end: string;
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

export function isUpcoming(shift: PortalShift, now: number): boolean {
  const start = Date.parse(shift.start);
  return start >= now && start < now + UPCOMING_DAYS * 24 * 60 * 60 * 1000;
}

export function isPast(shift: PortalShift, now: number): boolean {
  return Date.parse(shift.end) <= now;
}
