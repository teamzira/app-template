import { isPast, type PortalShift } from '../portal/types';

export interface StaffSummary {
  id: string;
  name: string;
  shiftsWorked: number;
  hoursWorked: number;
  locations: string[];
  /** ISO start of their next scheduled shift, if any. */
  nextShift: string | null;
}

/** Everyone assigned a shift in the window, busiest first. */
export function summarizeStaff(shifts: PortalShift[], now: number): StaffSummary[] {
  const byPerson = new Map<string, StaffSummary>();
  for (const shift of shifts) {
    if (!shift.assigneeId) continue;
    const person = byPerson.get(shift.assigneeId) ?? {
      id: shift.assigneeId,
      name: shift.assigneeName ?? 'Unnamed worker',
      shiftsWorked: 0,
      hoursWorked: 0,
      locations: [],
      nextShift: null,
    };
    if (isPast(shift, now)) {
      person.shiftsWorked += 1;
      person.hoursWorked += shift.hoursWorked ?? 0;
    } else if (!person.nextShift || shift.start < person.nextShift) {
      person.nextShift = shift.start;
    }
    if (shift.locationName && !person.locations.includes(shift.locationName)) person.locations.push(shift.locationName);
    byPerson.set(shift.assigneeId, person);
  }
  return [...byPerson.values()].sort((a, b) => b.hoursWorked - a.hoursWorked || a.name.localeCompare(b.name));
}
