import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { loadShifts } from '../../shared/load-shifts';
import { SectionPage } from '../../shared/section-page';
import { DAY_MS, LATE_AFTER_MINUTES, REPORT_DAYS } from '../../shared/types';
import { getFlag } from './attendance';
import { AttendanceList } from './attendance-list';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function AttendanceReportPage({ searchParams }: Props) {
  const { location } = await searchParams;
  const now = new Date();
  const result = await loadShifts({ from: new Date(now.getTime() - REPORT_DAYS * DAY_MS), to: now, location });
  const worked =
    result.status === 'ok'
      ? result.shifts.filter((shift) => shift.assigneeId && Date.parse(shift.end) <= now.getTime()).reverse()
      : [];
  const flagged = worked.filter((shift) => getFlag(shift) !== 'on-time');
  const late = flagged.filter((shift) => getFlag(shift) === 'late').length;
  const missing = flagged.length - late;
  const onTimePct = worked.length > 0 ? Math.round(((worked.length - flagged.length) / worked.length) * 100) : null;
  const period = `Last ${REPORT_DAYS} days`;

  return (
    <SectionPage
      title="Attendance report"
      description={`Late arrivals (more than ${LATE_AFTER_MINUTES} minutes) and missing punches.`}
      result={result}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AlloyStatCard title="On time" subtitle={period} value={onTimePct === null ? '—' : `${onTimePct}%`} />
        <AlloyStatCard title="Late arrivals" subtitle={period} value={late} accent={late > 0 ? 'orange' : 'slate'} />
        <AlloyStatCard title="Missing punches" subtitle={period} value={missing} accent={missing > 0 ? 'red' : 'slate'} />
      </div>
      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="Needs attention" subtitle={period} size="m" />
        <AttendanceList shifts={flagged} emptyText="Every shift was on time and fully punched." />
      </section>
    </SectionPage>
  );
}
