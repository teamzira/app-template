import AlloyBarList from '@teamzira/alloy/components/barList/AlloyBarList';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { ShiftList } from './shift-list';
import { formatHours, isPast, isUpcoming, UPCOMING_DAYS, WINDOW_DAYS, type PortalShift } from './types';

function countBy(shifts: PortalShift[], key: (shift: PortalShift) => string) {
  const counts = new Map<string, number>();
  for (const shift of shifts) counts.set(key(shift), (counts.get(key(shift)) ?? 0) + 1);
  return [...counts].map(([label, value]) => ({ id: label, label, value })).sort((a, b) => b.value - a.value);
}

export function Overview({ shifts, now, byRole }: { shifts: PortalShift[]; now: number; byRole: boolean }) {
  const upcoming = shifts.filter((shift) => isUpcoming(shift, now));
  const open = upcoming.filter((shift) => !shift.assigneeId);
  const filledPct = upcoming.length > 0 ? Math.round(((upcoming.length - open.length) / upcoming.length) * 100) : null;
  const hoursDelivered = shifts.filter((shift) => isPast(shift, now)).reduce((sum, s) => sum + (s.hoursWorked ?? 0), 0);
  // At one location the useful split is by role; across all of them, by location.
  const breakdown = byRole
    ? countBy(upcoming, (shift) => shift.roleName ?? 'No role')
    : countBy(upcoming, (shift) => shift.locationName ?? 'No location');
  const nextWeek = `Next ${UPCOMING_DAYS} days`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AlloyStatCard title="Shifts coming up" subtitle={nextWeek} value={upcoming.length} />
        <AlloyStatCard title="Open shifts" subtitle={nextWeek} value={open.length} accent={open.length > 0 ? 'orange' : 'slate'} />
        <AlloyStatCard title="Filled" subtitle={nextWeek} value={filledPct === null ? '—' : `${filledPct}%`} />
        <AlloyStatCard title="Hours delivered" subtitle={`Last ${WINDOW_DAYS} days`} value={formatHours(hoursDelivered)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <section className="alloy-chart-card flex flex-col gap-3 lg:col-span-3">
          <AlloySectionHeader title="Open shifts" size="m" />
          <ShiftList shifts={open} emptyText={`Every shift in the next ${UPCOMING_DAYS} days is filled.`} />
        </section>
        <section className="alloy-chart-card flex flex-col gap-3 lg:col-span-2">
          <AlloySectionHeader title={byRole ? 'Shifts by role' : 'Shifts by location'} subtitle={nextWeek} size="m" />
          {breakdown.length > 0 ? (
            <AlloyBarList items={breakdown} />
          ) : (
            <p className="alloy-paragraph-m py-2 text-alloy-slate-500">No shifts in the next {UPCOMING_DAYS} days.</p>
          )}
        </section>
      </div>
    </>
  );
}
