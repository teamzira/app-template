import { loadPortal } from './portal/data';
import { Overview } from './portal/overview';
import { PortalPage } from './portal/portal-page';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function OverviewPage({ searchParams }: Props) {
  const data = await loadPortal((await searchParams).location);
  return <PortalPage data={data}>{data.status === 'ok' && <Overview shifts={data.shifts} now={data.now} byRole={!!data.locationId} />}</PortalPage>;
}
