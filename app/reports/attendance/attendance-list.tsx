'use client';

import AlloyAvatar from '@teamzira/alloy/components/avatar/AlloyAvatar';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { useOpenRecord } from '@/lib/teambridge/router';
import type { Shift } from '../../shared/types';
import { dayFormat, timeFormat, useIsBrowser } from '../../shared/use-is-browser';
import { FLAG_STATUS, getFlag } from './attendance';

type Props = { shifts: Shift[]; emptyText: string };

function describe(shift: Shift): string {
  const parts = [dayFormat.format(new Date(shift.start))];
  if (shift.locationName) parts.push(shift.locationName);
  parts.push(`Due ${timeFormat.format(new Date(shift.start))}`);
  if (shift.clockIn) parts.push(`In ${timeFormat.format(new Date(shift.clockIn))}`);
  return parts.join(' · ');
}

/** Worked shifts with their punch status; a row opens the shift in Teambridge to fix it. */
export function AttendanceList({ shifts, emptyText }: Props) {
  const { openRecord } = useOpenRecord();
  const hasTimes = useIsBrowser();

  if (shifts.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {shifts.map((shift, index) => {
        const flag = FLAG_STATUS[getFlag(shift)];
        const name = shift.assigneeName ?? 'Unnamed worker';
        return (
          <li key={shift.id}>
            <AlloyListItem
              size="large"
              label={name}
              description={hasTimes ? describe(shift) : ' '}
              leadingSlot={<AlloyAvatar name={shift.assigneeName ?? undefined} size="md" />}
              trailingSlot={<AlloyStatusTag label={flag.label} status={flag.status} size="small" withDot />}
              trailingAction="chevron"
              divider={index < shifts.length - 1}
              aria-label={`${name}, ${flag.label}`}
              onClick={() => openRecord(shift.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
