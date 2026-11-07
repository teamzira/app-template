'use client';

import AlloyAvatar from '@teamzira/alloy/components/avatar/AlloyAvatar';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import AlloyStatusTag from '@teamzira/alloy/components/tags/AlloyStatusTag';
import { useOpenRecord } from '@/lib/teambridge/router';
import { stageTag } from '../jobs/types';
import type { Candidate } from './candidates';

type Props = { candidates: Candidate[] };

/** One row per person put forward; a row opens their Teambridge profile. */
export function CandidateList({ candidates }: Props) {
  const { openRecord } = useOpenRecord();

  if (candidates.length === 0) {
    return <p className="alloy-paragraph-m py-2 text-alloy-slate-500">No one has been put forward yet.</p>;
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {candidates.map((candidate, index) => {
        const tag = stageTag(candidate.stage);
        const jobs =
          candidate.jobNames.length > 1 ? `${candidate.jobNames.length} job orders` : (candidate.jobNames[0] ?? null);
        return (
          <li key={candidate.id}>
            <AlloyListItem
              size="large"
              label={candidate.name}
              description={[jobs, candidate.locations.join(', ') || null].filter(Boolean).join(' · ') || ' '}
              leadingSlot={<AlloyAvatar name={candidate.name} size="md" />}
              trailingSlot={<AlloyStatusTag label={tag.label} status={tag.status} size="small" withDot />}
              trailingAction="chevron"
              divider={index < candidates.length - 1}
              aria-label={`${candidate.name}, ${tag.label}`}
              onClick={() => openRecord(candidate.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
