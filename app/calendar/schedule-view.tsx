'use client';

import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { TagStatus } from '@teamzira/alloy/components/tags/interface';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { AppPage } from '@/components/app-shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpenRecord } from '@/lib/teambridge/router';
import { LocationFilter } from '../shared/location-filter';
import { ShiftList } from '../shared/shift-list';
import type { Location, Shift } from '../shared/types';
import { dayFormat, useIsBrowser } from '../shared/use-is-browser';
import { CalendarMonth } from './calendar-month';
import { monthGrid, toDayKey } from './month';
import { PeriodStepper } from './period-stepper';

type Props = {
  year: number;
  month: number;
  locations: Location[];
  locationId: string | null;
  /** The server-rendered SetupNotice, shown above the grid. */
  notice?: ReactNode;
} & ({ shifts: Shift[]; error?: never } | { shifts?: never; error: string });

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The month calendar: a full-width tool page with the period stepper and location filter above
 * the grid, and the selected day's shifts in the side panel. The day is `?day=` in the URL, set
 * with the History API so choosing one doesn't re-read the month on the server.
 */
export function ScheduleView({ year, month, locations, locationId, notice, shifts, error }: Props) {
  const searchParams = useSearchParams();
  const { openRecord } = useOpenRecord();
  const isBrowser = useIsBrowser();
  const weeks = useMemo(() => monthGrid(year, month), [year, month]);

  // The grid and every date on it are in the viewer's zone, so they wait for the browser.
  const todayKey = isBrowser ? toDayKey(new Date()) : '';
  const requestedDay = searchParams.get('day');
  const firstOfMonth = toDayKey(new Date(year, month, 1));
  const selectedKey =
    requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay)
      ? requestedDay
      : todayKey.startsWith(firstOfMonth.slice(0, 7))
        ? todayKey
        : firstOfMonth;

  const shiftsByDay = useMemo(() => {
    const byDay = new Map<string, Shift[]>();
    if (!isBrowser) return byDay;
    for (const shift of shifts ?? []) {
      const key = toDayKey(new Date(shift.start));
      byDay.set(key, [...(byDay.get(key) ?? []), shift]);
    }
    return byDay;
  }, [shifts, isBrowser]);

  const monthShifts = (shifts ?? []).filter((shift) => {
    const start = new Date(shift.start);
    return start.getFullYear() === year && start.getMonth() === month;
  });
  const open = monthShifts.filter((shift) => !shift.assigneeId).length;
  const filledPct = monthShifts.length > 0 ? Math.round(((monthShifts.length - open) / monthShifts.length) * 100) : null;
  const dayShifts = shiftsByDay.get(selectedKey) ?? [];
  const dayOpen = dayShifts.filter((shift) => !shift.assigneeId).length;

  const selectDay = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('day', key);
    window.history.replaceState(null, '', `?${params.toString()}`);
  };

  const label = monthFormat.format(new Date(year, month, 1));

  return (
    <AppPage
      title="Clinic schedule"
      description="Every shift this month, by day."
      width="full"
      panel={
        error
          ? undefined
          : {
              title: isBrowser ? dayFormat.format(dateFromKey(selectedKey)) : 'Day',
              description:
                dayShifts.length === 0
                  ? 'No shifts this day.'
                  : `${dayShifts.length} ${dayShifts.length === 1 ? 'shift' : 'shifts'}${dayOpen > 0 ? `, ${dayOpen} open` : ''}.`,
              children: <ShiftList shifts={dayShifts} emptyText="Pick a day on the calendar." size="medium" />,
            }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodStepper year={year} month={month} label={label} />
        {locations.length > 1 && <LocationFilter locations={locations} locationId={locationId} />}
      </div>

      {error ? (
        <AlloyAlert variant="error" title="Couldn't load the schedule">
          {error}
        </AlloyAlert>
      ) : (
        <>
          {notice}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <AlloyStatCard variant="elevated" title="Shifts" subtitle={label} value={monthShifts.length} />
            <AlloyStatCard
              variant="elevated"
              title="Open shifts"
              subtitle={label}
              value={open}
              accent={open > 0 ? 'orange' : 'slate'}
            />
            <AlloyStatCard
              variant="elevated"
              title="Filled"
              subtitle={label}
              value={filledPct === null ? '—' : `${filledPct}%`}
            />
          </div>

          {isBrowser ? (
            <CalendarMonth
              weeks={weeks}
              month={month}
              todayKey={todayKey}
              selectedKey={selectedKey}
              shiftsByDay={shiftsByDay}
              onSelectDay={selectDay}
              onOpenShift={openRecord}
            />
          ) : (
            <Skeleton className="h-[36rem] w-full rounded-xl" />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <AlloyStatusTag label="Filled" status={TagStatus.POSITIVE} size="small" withDot />
            <AlloyStatusTag label="Open" status={TagStatus.WARNING} size="small" withDot />
          </div>
        </>
      )}
    </AppPage>
  );
}
