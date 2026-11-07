import { TagStatus } from '@teamzira/alloy/components/tags/interface';
import { LATE_AFTER_MINUTES, type Shift } from '../../shared/types';

export type AttendanceFlag = 'not-clocked-in' | 'missing-clock-out' | 'late' | 'on-time';

export const FLAG_STATUS: Record<AttendanceFlag, { label: string; status: TagStatus }> = {
  'not-clocked-in': { label: 'No clock-in', status: TagStatus.NEGATIVE },
  'missing-clock-out': { label: 'No clock-out', status: TagStatus.NEGATIVE },
  late: { label: 'Late', status: TagStatus.WARNING },
  'on-time': { label: 'On time', status: TagStatus.POSITIVE },
};

/** How a shift that has ended was punched: open shifts have no one to punch, so they aren't asked. */
export function getFlag(shift: Shift): AttendanceFlag {
  if (!shift.clockIn) return 'not-clocked-in';
  if (!shift.clockOut) return 'missing-clock-out';
  const minutesLate = (Date.parse(shift.clockIn) - Date.parse(shift.start)) / 60_000;
  return minutesLate > LATE_AFTER_MINUTES ? 'late' : 'on-time';
}
