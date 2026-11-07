import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import { loadPortal } from '../portal/data';
import { PortalPage } from '../portal/portal-page';
import { WINDOW_DAYS } from '../portal/types';
import { ScheduleTable } from './schedule-table';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function SchedulePage({ searchParams }: Props) {
  const data = await loadPortal((await searchParams).location);
  return (
    <PortalPage data={data}>
      {data.status === 'ok' && (
        <section className="alloy-chart-card flex flex-col gap-3">
          <AlloySectionHeader title="Scheduled shifts" subtitle={`Next ${WINDOW_DAYS} days`} size="m" />
          <ScheduleTable shifts={data.shifts.filter((shift) => Date.parse(shift.end) > data.now)} />
        </section>
      )}
    </PortalPage>
  );
}
