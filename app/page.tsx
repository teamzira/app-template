import { SetupNotice } from '@/components/setup-notice';
import { ScheduleView } from './calendar/schedule-view';
import { parseMonth } from './calendar/month';
import { loadShifts } from './shared/load-shifts';
import { DAY_MS } from './shared/types';

type Props = { searchParams: Promise<{ month?: string; location?: string }> };

// The grid is laid out in the viewer's zone, which can push a day either side of the month into
// view; a week's margin each way covers it.
const MARGIN_DAYS = 7;

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = new Date();
  const { year, month } = parseMonth(params.month) ?? { year: today.getUTCFullYear(), month: today.getUTCMonth() };
  const from = new Date(Date.UTC(year, month, 1) - MARGIN_DAYS * DAY_MS);
  const to = new Date(Date.UTC(year, month + 1, 1) + MARGIN_DAYS * DAY_MS);
  const result = await loadShifts({ from, to, location: params.location });

  return result.status === 'ok' ? (
    <ScheduleView year={year} month={month} locations={result.locations} locationId={result.locationId}
      notice={<SetupNotice issues={result.issues} />}
      shifts={result.shifts}
    />
  ) : (
    <ScheduleView year={year} month={month} locations={result.locations} locationId={result.locationId} error={result.message} />
  );
}
