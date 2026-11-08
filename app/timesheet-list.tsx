'use client';

import { useSyncExternalStore } from 'react';
import AlloyAvatar from '@teamzira/alloy/components/avatar/AlloyAvatar';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { CardList, cardRow } from '@/components/app-shell/card-list';
import { useOpenRecord } from '@/lib/teambridge/router';
import { FLAG_STATUS, formatHours, type TimesheetRow } from './timesheet';

type Props = {
  rows: TimesheetRow[];
  emptyText: string;
};

// Times are shown in the viewer's zone, which only the browser knows, so the server renders the
// rows without them and the client fills them in.
const subscribeToNothing = () => () => {};
const isBrowser = () => true;
const isServer = () => false;

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function describe(row: TimesheetRow): string {
  const parts = [dayFormat.format(new Date(row.start))];
  if (row.locationName) parts.push(row.locationName);
  parts.push(row.clockIn ? `In ${timeFormat.format(new Date(row.clockIn))}` : `Due ${timeFormat.format(new Date(row.start))}`);
  if (row.clockOut) parts.push(`Out ${timeFormat.format(new Date(row.clockOut))}`);
  return parts.join(' · ');
}

export function TimesheetList({ rows, emptyText }: Props) {
  const { openRecord } = useOpenRecord();
  const hasTimes = useSyncExternalStore(subscribeToNothing, isBrowser, isServer);

  if (rows.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">{emptyText}</p>;
  }

  return (
    <CardList>
      {rows.map((row, index) => {
        const flag = FLAG_STATUS[row.flag];
        const name = row.assigneeName ?? 'Unassigned';
        return (
          <li key={row.id}>
            <AlloyListItem
              size="large"
              {...cardRow()}
              label={name}
              description={hasTimes ? describe(row) : ' '}
              leadingSlot={<AlloyAvatar name={row.assigneeName ?? undefined} size="md" />}
              trailingSlot={
                <>
                  {row.hoursWorked !== null && (
                    <span className="alloy-paragraph-s hidden text-alloy-slate-500 sm:inline">
                      {formatHours(row.hoursWorked)}
                    </span>
                  )}
                  <AlloyStatusTag label={flag.label} status={flag.status} size="small" withDot />
                </>
              }
              trailingAction="chevron"
              divider={index < rows.length - 1}
              aria-label={`${name}, ${flag.label}`}
              onClick={() => openRecord(row.id)}
            />
          </li>
        );
      })}
    </CardList>
  );
}
