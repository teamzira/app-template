import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import { loadPortal } from '../portal/data';
import { PortalPage } from '../portal/portal-page';
import { WINDOW_DAYS } from '../portal/types';
import { summarizeStaff } from './staff';
import { StaffList } from './staff-list';

type Props = { searchParams: Promise<{ location?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const data = await loadPortal((await searchParams).location);
  return (
    <PortalPage data={data}>
      {data.status === 'ok' && (
        <section className="alloy-chart-card flex flex-col gap-3">
          <AlloySectionHeader title="Your team" subtitle={`Worked in the last ${WINDOW_DAYS} days, or scheduled next`} size="m" />
          <StaffList staff={summarizeStaff(data.shifts, data.now)} />
        </section>
      )}
    </PortalPage>
  );
}
