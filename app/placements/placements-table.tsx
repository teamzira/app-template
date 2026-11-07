'use client';

import AlloyTable from '@teamzira/alloy/components/table/AlloyTable';
import type { AlloyTableColumn } from '@teamzira/alloy/components/table/types';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { useOpenRecord } from '@/lib/teambridge/router';
import { stageTag, type Placement } from '../jobs/types';
import { useIsBrowser } from '../jobs/use-is-browser';

type Props = { placements: Placement[] };

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const byText = (pick: (p: Placement) => string | null) => (a: Placement, b: Placement) =>
  (pick(a) ?? '').localeCompare(pick(b) ?? '');

/** Everyone put forward or placed on these job orders; a row opens the placement in Teambridge. */
export function PlacementsTable({ placements }: Props) {
  const { openRecord } = useOpenRecord();
  const hasDates = useIsBrowser();

  const columns: AlloyTableColumn<Placement>[] = [
    {
      key: 'worker',
      header: 'Worker',
      sortable: true,
      comparator: byText((p) => p.workerName),
      render: (p) => p.workerName ?? <span className="text-alloy-slate-500">Not assigned</span>,
    },
    { key: 'job', header: 'Job order', sortable: true, comparator: byText((p) => p.jobName), render: (p) => p.jobName ?? '—' },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      comparator: byText((p) => p.locationName),
      render: (p) => p.locationName ?? '—',
    },
    {
      key: 'start',
      header: 'Starts',
      sortable: true,
      comparator: (a, b) => Date.parse(a.start ?? '') - Date.parse(b.start ?? ''),
      render: (p) => (hasDates && p.start ? dateFormat.format(new Date(p.start)) : ''),
    },
    {
      key: 'stage',
      header: 'Stage',
      sortable: true,
      comparator: byText((p) => p.stage),
      render: (p) => {
        const tag = stageTag(p.stage);
        return <AlloyStatusTag label={tag.label} status={tag.status} size="small" withDot />;
      },
    },
  ];

  return (
    <AlloyTable
      columns={columns}
      data={placements}
      getRowKey={(p) => p.id}
      onRowClick={(p) => openRecord(p.id)}
      rowAriaLabel={(p) => `${p.workerName ?? 'Placement'} on ${p.jobName ?? 'a job order'}`}
      defaultSort={{ columnKey: 'start', direction: 'asc' }}
      pagination={{ mode: 'client', pageSize: 20 }}
      emptyState="No one has been put forward for these job orders yet."
    />
  );
}
