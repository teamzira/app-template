'use client';

import AlloyTable from '@teamzira/alloy/components/table/AlloyTable';
import type { AlloyTableColumn } from '@teamzira/alloy/components/table/types';
import { TagStatus } from '@teamzira/alloy/components/tags/interface';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { useOpenRecord } from '@/lib/teambridge/router';
import type { PortalShift } from '../portal/types';
import { dayFormat, formatTimeRange, useIsBrowser } from '../portal/use-is-browser';

type Props = { shifts: PortalShift[] };

const byStart = (a: PortalShift, b: PortalShift) => Date.parse(a.start) - Date.parse(b.start);
const byText = (pick: (s: PortalShift) => string | null) => (a: PortalShift, b: PortalShift) =>
  (pick(a) ?? '').localeCompare(pick(b) ?? '');

/** Every scheduled shift ahead, one row each; a row opens the shift in Teambridge. */
export function ScheduleTable({ shifts }: Props) {
  const { openRecord } = useOpenRecord();
  const hasTimes = useIsBrowser();

  const columns: AlloyTableColumn<PortalShift>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      comparator: byStart,
      render: (shift) => (hasTimes ? dayFormat.format(new Date(shift.start)) : ''),
    },
    {
      key: 'time',
      header: 'Time',
      render: (shift) => (hasTimes ? formatTimeRange(shift.start, shift.end) : ''),
    },
    { key: 'location', header: 'Location', sortable: true, comparator: byText((s) => s.locationName), render: (s) => s.locationName ?? '—' },
    { key: 'role', header: 'Role', sortable: true, comparator: byText((s) => s.roleName), render: (s) => s.roleName ?? '—' },
    {
      key: 'worker',
      header: 'Worker',
      sortable: true,
      comparator: byText((s) => s.assigneeName),
      render: (s) => (s.assigneeId ? (s.assigneeName ?? 'Unnamed worker') : <span className="text-alloy-slate-500">Unassigned</span>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <AlloyStatusTag
          label={s.assigneeId ? 'Filled' : 'Open'}
          status={s.assigneeId ? TagStatus.POSITIVE : TagStatus.WARNING}
          size="small"
          withDot
        />
      ),
    },
  ];

  return (
    <AlloyTable
      columns={columns}
      data={shifts}
      getRowKey={(shift) => shift.id}
      onRowClick={(shift) => openRecord(shift.id)}
      rowAriaLabel={(shift) => `Open shift on ${shift.start}`}
      defaultSort={{ columnKey: 'date', direction: 'asc' }}
      pagination={{ mode: 'client', pageSize: 20 }}
      emptyState="No shifts scheduled in the next two weeks."
    />
  );
}
