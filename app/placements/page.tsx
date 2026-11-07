import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import { loadJobOrders } from '../jobs/data';
import { JobsPage } from '../jobs/jobs-page';
import { PlacementsTable } from './placements-table';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function PlacementsPage({ searchParams }: Props) {
  const data = await loadJobOrders((await searchParams).location);
  return (
    <JobsPage data={data}>
      {data.status === 'ok' && (
        <section className="alloy-chart-card flex flex-col gap-3">
          <AlloySectionHeader title="Placements" subtitle="On the job orders above, soonest start first" size="m" />
          <PlacementsTable placements={data.placements} />
        </section>
      )}
    </JobsPage>
  );
}
