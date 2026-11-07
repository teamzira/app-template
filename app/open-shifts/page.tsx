import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import { loadShifts } from '../shared/load-shifts';
import { SectionPage } from '../shared/section-page';
import { ShiftList } from '../shared/shift-list';
import { DAY_MS } from '../shared/types';

type Props = { searchParams: Promise<{ location?: string }> };

const AHEAD_DAYS = 14;

export default async function OpenShiftsPage({ searchParams }: Props) {
  const { location } = await searchParams;
  const now = new Date();
  const result = await loadShifts({ from: now, to: new Date(now.getTime() + AHEAD_DAYS * DAY_MS), location });
  const open = result.status === 'ok' ? result.shifts.filter((shift) => !shift.assigneeId) : [];

  return (
    <SectionPage title="Open shifts" description={`Shifts in the next ${AHEAD_DAYS} days with no one assigned.`} result={result}>
      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title={`${open.length} to fill`} size="m" />
        <ShiftList shifts={open} emptyText={`Every shift in the next ${AHEAD_DAYS} days is filled.`} />
      </section>
    </SectionPage>
  );
}
