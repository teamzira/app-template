import AlloyBarList from '@teamzira/alloy/components/barList/AlloyBarList';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { loadJobOrders } from '../../jobs/data';
import { JobsPage } from '../../jobs/jobs-page';
import { isOpenJob, type JobOrder } from '../../jobs/types';

type Props = { searchParams: Promise<{ location?: string }> };

function sumBy(jobs: JobOrder[], key: (job: JobOrder) => string, value: (job: JobOrder) => number) {
  const totals = new Map<string, number>();
  for (const job of jobs) totals.set(key(job), (totals.get(key(job)) ?? 0) + value(job));
  return [...totals]
    .filter(([, total]) => total > 0)
    .map(([label, total]) => ({ id: label, label, value: total }))
    .sort((a, b) => b.value - a.value);
}

export default async function FillReportPage({ searchParams }: Props) {
  const data = await loadJobOrders((await searchParams).location);
  const jobs = data.status === 'ok' ? data.jobs : [];
  const open = jobs.filter((job) => isOpenJob(job.status));
  const unstaffed = open.filter((job) => job.placed === 0).length;
  const placedByLocation = sumBy(jobs, (job) => job.locationName ?? 'No location', (job) => job.placed);
  const openByLocation = sumBy(open, (job) => job.locationName ?? 'No location', () => 1);

  return (
    <JobsPage title="Fill report" description="Where job orders are open, and where people have been placed." data={data}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AlloyStatCard title="Open job orders" value={open.length} />
        <AlloyStatCard title="Open with no one placed" value={unstaffed} accent={unstaffed > 0 ? 'orange' : 'slate'} />
        <AlloyStatCard title="People placed" value={jobs.reduce((sum, job) => sum + job.placed, 0)} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[
          { title: 'Open job orders by location', items: openByLocation, empty: 'No open job orders.' },
          { title: 'People placed by location', items: placedByLocation, empty: 'No one placed yet.' },
        ].map(({ title, items, empty }) => (
          <section key={title} className="alloy-chart-card flex flex-col gap-3">
            <AlloySectionHeader title={title} size="m" />
            {items.length > 0 ? (
              <AlloyBarList items={items} />
            ) : (
              <p className="alloy-paragraph-m py-2 text-alloy-slate-500">{empty}</p>
            )}
          </section>
        ))}
      </div>
    </JobsPage>
  );
}
