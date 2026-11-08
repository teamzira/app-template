'use client';

import AlloyAvatar from '@teamzira/alloy/components/avatar/AlloyAvatar';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import { CardList, cardRow } from '@/components/app-shell/card-list';
import { useOpenRecord } from '@/lib/teambridge/router';
import { formatHours } from '../portal/types';
import { dayFormat, useIsBrowser } from '../portal/use-is-browser';
import type { StaffSummary } from './staff';

type Props = { staff: StaffSummary[] };

/** One row per person who works at the client's locations; a row opens their Teambridge profile. */
export function StaffList({ staff }: Props) {
  const { openRecord } = useOpenRecord();
  const hasTimes = useIsBrowser();

  if (staff.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">No one has worked or been scheduled here yet.</p>;
  }

  return (
    <CardList>
      {staff.map((person, index) => {
        const details = [
          `${person.shiftsWorked} ${person.shiftsWorked === 1 ? 'shift' : 'shifts'} worked`,
          formatHours(person.hoursWorked),
          person.locations.length > 2 ? `${person.locations.length} locations` : person.locations.join(', ') || null,
        ].filter(Boolean);
        return (
          <li key={person.id}>
            <AlloyListItem
              size="large"
              {...cardRow()}
              label={person.name}
              description={details.join(' · ')}
              leadingSlot={<AlloyAvatar name={person.name} size="md" />}
              trailingSlot={
                person.nextShift && hasTimes ? (
                  <span className="alloy-paragraph-s hidden text-alloy-slate-500 sm:inline">
                    Next {dayFormat.format(new Date(person.nextShift))}
                  </span>
                ) : undefined
              }
              trailingAction="chevron"
              divider={index < staff.length - 1}
              onClick={() => openRecord(person.id)}
            />
          </li>
        );
      })}
    </CardList>
  );
}
