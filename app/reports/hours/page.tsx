import AlloyBarList from '@teamzira/alloy/components/barList/AlloyBarList';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { loadShifts } from '../../shared/load-shifts';
import { SectionPage } from '../../shared/section-page';
import { DAY_MS, formatHours, REPORT_DAYS, type Shift } from '../../shared/types';

type Props = { searchParams: Promise<{ location?: string }> };

function hoursBy(shifts: Shift[], key: (shift: Shift) => string | null) {
  const totals = new Map<string, number>();
  for (const shift of shifts) {
    const label = key(shift) ?? 'Unassigned';
    totals.set(label, (totals.get(label) ?? 0) + (shift.hoursWorked ?? 0));
  }
  return [...totals]
    .filter(([, hours]) => hours > 0)
    .map(([label, hours]) => ({ id: label, label, value: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.value - a.value);
}

export default async function HoursReportPage({ searchParams }: Props) {
  const { location } = await searchParams;
  const now = new Date();
  const result = await loadShifts({ from: new Date(now.getTime() - REPORT_DAYS * DAY_MS), to: now, location });
  const worked = result.status === 'ok' ? result.shifts.filter((shift) => Date.parse(shift.end) <= now.getTime()) : [];
  const total = worked.reduce((sum, shift) => sum + (shift.hoursWorked ?? 0), 0);
  const byLocation = hoursBy(worked, (shift) => shift.locationName);
  const byPerson = hoursBy(worked, (shift) => shift.assigneeName);
  const period = `Last ${REPORT_DAYS} days`;

  return (
    <SectionPage title="Hours report" description="Hours worked, by location and by person." result={result}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AlloyStatCard title="Hours worked" subtitle={period} value={formatHours(total)} />
        <AlloyStatCard title="Shifts worked" subtitle={period} value={worked.length} />
        <AlloyStatCard
          title="Average shift"
          subtitle={period}
          value={worked.length > 0 ? formatHours(total / worked.length) : '—'}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[
          { title: 'By location', items: byLocation },
          { title: 'By person', items: byPerson },
        ].map(({ title, items }) => (
          <section key={title} className="alloy-chart-card flex flex-col gap-3">
            <AlloySectionHeader title={title} subtitle={period} size="m" />
            {items.length > 0 ? (
              <AlloyBarList items={items} />
            ) : (
              <p className="alloy-paragraph-m py-2 text-alloy-slate-500">No hours worked in this period.</p>
            )}
          </section>
        ))}
      </div>
    </SectionPage>
  );
}
