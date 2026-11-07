'use client';

import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import Briefcase01Icon from '@teamzira/alloy/icons-js/Education/Briefcase01Icon';
import { useOpenRecord } from '@/lib/teambridge/router';
import { jobStatusTag, money, type JobOrder } from './types';
import { useIsBrowser } from './use-is-browser';

type Props = {
  jobs: JobOrder[];
  emptyText: string;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function describe(job: JobOrder, hasDates: boolean): string {
  const dates = hasDates
    ? job.end
      ? `${dateFormat.format(new Date(job.start))} – ${dateFormat.format(new Date(job.end))}`
      : `From ${dateFormat.format(new Date(job.start))}`
    : null;
  return [job.locationName, job.roleName, dates, job.hourlyRate !== null ? `${money.format(job.hourlyRate)}/hr` : null]
    .filter(Boolean)
    .join(' · ');
}

function placedText(job: JobOrder): string | null {
  if (job.placed === 0 && job.inProgress === 0) return null;
  const parts = [job.placed > 0 ? `${job.placed} placed` : null, job.inProgress > 0 ? `${job.inProgress} in progress` : null];
  return parts.filter(Boolean).join(' · ');
}

/** Job orders as list rows; a row opens the job in Teambridge's record panel. */
export function JobList({ jobs, emptyText }: Props) {
  const { openRecord } = useOpenRecord();
  const hasDates = useIsBrowser();

  if (jobs.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {jobs.map((job, index) => {
        const tag = jobStatusTag(job.status);
        const placed = placedText(job);
        return (
          <li key={job.id}>
            <AlloyListItem
              size="large"
              label={job.name}
              description={describe(job, hasDates) || ' '}
              leadingSlot={<Briefcase01Icon size={20} className="text-alloy-slate-500" />}
              trailingSlot={
                <>
                  {placed && <span className="alloy-paragraph-s hidden text-alloy-slate-500 sm:inline">{placed}</span>}
                  <AlloyStatusTag label={tag.label} status={tag.status} size="small" withDot />
                </>
              }
              trailingAction="chevron"
              divider={index < jobs.length - 1}
              aria-label={`${job.name}, ${tag.label}`}
              onClick={() => openRecord(job.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
