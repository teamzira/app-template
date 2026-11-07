import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { loadJobOrders } from './jobs/data';
import { JobList } from './jobs/job-list';
import { JobsPage } from './jobs/jobs-page';
import { isOpenJob } from './jobs/types';

type Props = { searchParams: Promise<{ location?: string }> };

// "Starting soon" looks this far ahead.
const SOON_DAYS = 14;

export default async function JobOrdersPage({ searchParams }: Props) {
  const data = await loadJobOrders((await searchParams).location);
  if (data.status !== 'ok') return <JobsPage data={data}>{null}</JobsPage>;

  const open = data.jobs.filter((job) => isOpenJob(job.status));
  const startingSoon = open.filter((job) => {
    const start = Date.parse(job.start);
    return start >= data.now && start < data.now + SOON_DAYS * 24 * 60 * 60 * 1000;
  });
  const placed = data.jobs.reduce((sum, job) => sum + job.placed, 0);
  const others = data.jobs.filter((job) => !isOpenJob(job.status));

  return (
    <JobsPage data={data}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AlloyStatCard title="Open job orders" value={open.length} />
        <AlloyStatCard
          title="Starting soon"
          subtitle={`Next ${SOON_DAYS} days`}
          value={startingSoon.length}
          accent={startingSoon.length > 0 ? 'orange' : 'slate'}
        />
        <AlloyStatCard title="People placed" value={placed} />
      </div>

      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="Open" subtitle="Soonest start first" size="m" />
        <JobList jobs={open} emptyText="No open job orders. Create one with New job order." />
      </section>

      {others.length > 0 && (
        <section className="alloy-chart-card flex flex-col gap-3">
          <AlloySectionHeader title="Filled and closed" size="m" />
          <JobList jobs={others} emptyText="" />
        </section>
      )}
    </JobsPage>
  );
}
