import AlloyBarList from '@teamzira/alloy/components/barList/AlloyBarList';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import { loadJobOrders } from '../../jobs/data';
import { JobsPage } from '../../jobs/jobs-page';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function PipelineReportPage({ searchParams }: Props) {
  const data = await loadJobOrders((await searchParams).location);
  const counts = new Map<string, number>();
  for (const placement of data.status === 'ok' ? data.placements : []) {
    const stage = placement.stage ?? 'No stage';
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  const items = [...counts].map(([label, value]) => ({ id: label, label, value })).sort((a, b) => b.value - a.value);

  return (
    <JobsPage title="Pipeline report" description="How far each placement has got." data={data}>
      <section className="alloy-chart-card flex flex-col gap-3">
        <AlloySectionHeader title="Placements by stage" size="m" />
        {items.length > 0 ? (
          <AlloyBarList items={items} />
        ) : (
          <p className="alloy-paragraph-m py-2 text-alloy-slate-500">No one has been put forward yet.</p>
        )}
      </section>
    </JobsPage>
  );
}
