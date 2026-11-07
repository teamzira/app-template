import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import type { SchemaIssue } from '@/lib/teambridge/schema';
import { AppBanner } from '@/components/app-shell/banner';
import { AppPage } from '@/components/app-shell/page';
import { SetupNotice } from '@/components/setup-notice';
import { formatHours, PERIOD_DAYS, type TimesheetRow } from './timesheet';
import { TimesheetList } from './timesheet-list';

type Props = {
  rows: TimesheetRow[];
  issues: SchemaIssue[];
  firstName: string;
};

export function TimesheetView({ rows, issues, firstName }: Props) {
  const needsAttention = rows.filter((row) => row.flag !== 'on-time');
  const late = rows.filter((row) => row.flag === 'late').length;
  const missing = rows.filter((row) => row.flag === 'missing-clock-out' || row.flag === 'not-clocked-in').length;
  const totalHours = rows.reduce((sum, row) => sum + (row.hoursWorked ?? 0), 0);
  const summary =
    needsAttention.length > 0
      ? `${needsAttention.length} ${needsAttention.length === 1 ? 'shift needs' : 'shifts need'} a look before payroll.`
      : 'Every shift is clocked in and out.';

  return (
    <AppPage title="Timesheets" description={`Worked shifts from the last ${PERIOD_DAYS} days.`}>
      <AppBanner kind="greeting" name={firstName} summary={summary} />
      <SetupNotice issues={issues} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AlloyStatCard title="Hours worked" subtitle={`Last ${PERIOD_DAYS} days`} value={formatHours(totalHours)} />
        <AlloyStatCard title="Shifts worked" subtitle={`Last ${PERIOD_DAYS} days`} value={rows.length} />
        <AlloyStatCard title="Late arrivals" value={late} accent={late > 0 ? 'orange' : 'slate'} />
        <AlloyStatCard title="Missing punches" value={missing} accent={missing > 0 ? 'red' : 'slate'} />
      </div>

      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="Needs attention" size="m" />
        <TimesheetList rows={needsAttention} emptyText="Nothing to review: every shift is on time and complete." />
      </section>

      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="All shifts" size="m" />
        <TimesheetList rows={rows} emptyText={`No shifts in the last ${PERIOD_DAYS} days.`} />
      </section>
    </AppPage>
  );
}
