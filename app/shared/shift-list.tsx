'use client';

import AlloyAvatar from '@teamzira/alloy/components/avatar/AlloyAvatar';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import { TagStatus } from '@teamzira/alloy/components/tags/interface';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import UserPlus01Icon from '@teamzira/alloy/icons-js/User/UserPlus01Icon';
import { useOpenRecord } from '@/lib/teambridge/router';
import type { Shift } from './types';
import { dayFormat, formatTimeRange, useIsBrowser } from './use-is-browser';

type Props = {
  shifts: Shift[];
  emptyText: string;
  /** `medium` in a side panel, where rows are narrower. */
  size?: 'medium' | 'large';
};

/** Shifts as list rows: who (or Open), when and where, opening the shift in Teambridge. */
export function ShiftList({ shifts, emptyText, size = 'large' }: Props) {
  const { openRecord } = useOpenRecord();
  const hasTimes = useIsBrowser();

  if (shifts.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {shifts.map((shift, index) => {
        const isOpen = !shift.assigneeId;
        const title = isOpen ? (shift.roleName ?? 'Open shift') : (shift.assigneeName ?? 'Unnamed worker');
        const details = [
          hasTimes ? `${dayFormat.format(new Date(shift.start))}, ${formatTimeRange(shift.start, shift.end)}` : null,
          shift.locationName,
          isOpen ? null : shift.roleName,
        ].filter(Boolean);
        return (
          <li key={shift.id}>
            <AlloyListItem
              size={size}
              label={title}
              description={details.join(' · ') || ' '}
              leadingSlot={
                isOpen ? (
                  <UserPlus01Icon size={20} className="text-alloy-slate-500" />
                ) : (
                  <AlloyAvatar name={shift.assigneeName ?? undefined} size="md" />
                )
              }
              trailingSlot={
                <AlloyStatusTag
                  label={isOpen ? 'Open' : 'Filled'}
                  status={isOpen ? TagStatus.WARNING : TagStatus.POSITIVE}
                  size="small"
                  withDot
                />
              }
              trailingAction="chevron"
              divider={index < shifts.length - 1}
              aria-label={`${title}, ${isOpen ? 'open' : 'filled'}`}
              onClick={() => openRecord(shift.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
