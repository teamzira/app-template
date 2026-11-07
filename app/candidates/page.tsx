import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import AlloyStatCard from '@teamzira/alloy/components/statCard/AlloyStatCard';
import { loadJobOrders } from '../jobs/data';
import { JobsPage } from '../jobs/jobs-page';
import { CandidateList } from './candidate-list';
import { summarizeCandidates } from './candidates';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function CandidatesPage({ searchParams }: Props) {
  const data = await loadJobOrders((await searchParams).location);
  const candidates = data.status === 'ok' ? summarizeCandidates(data.placements) : [];
  const placed = candidates.filter((c) => c.isPlaced).length;

  return (
    <JobsPage title="Candidates" description="People put forward for your job orders." data={data}>
      <div className="grid grid-cols-2 gap-4">
        <AlloyStatCard title="Put forward" value={candidates.length} />
        <AlloyStatCard title="Placed" value={placed} />
      </div>
      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="Everyone put forward" subtitle="Placed first" size="m" />
        <CandidateList candidates={candidates} />
      </section>
    </JobsPage>
  );
}
