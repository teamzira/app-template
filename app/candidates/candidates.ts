import { isPlaced, type Placement } from '../jobs/types';

export interface Candidate {
  id: string;
  name: string;
  jobNames: string[];
  locations: string[];
  /** The stage of their placement starting soonest, as the one worth showing. */
  stage: string | null;
  isPlaced: boolean;
}

/** Each person put forward, once, placed people first, then by name. */
export function summarizeCandidates(placements: Placement[]): Candidate[] {
  const byWorker = new Map<string, Candidate>();
  const soonestStart = new Map<string, number>();
  for (const placement of placements) {
    if (!placement.workerId) continue;
    const start = placement.start ? Date.parse(placement.start) : Number.POSITIVE_INFINITY;
    const candidate = byWorker.get(placement.workerId) ?? {
      id: placement.workerId,
      name: placement.workerName ?? 'Unnamed candidate',
      jobNames: [],
      locations: [],
      stage: placement.stage,
      isPlaced: false,
    };
    if (placement.jobName && !candidate.jobNames.includes(placement.jobName)) candidate.jobNames.push(placement.jobName);
    if (placement.locationName && !candidate.locations.includes(placement.locationName)) {
      candidate.locations.push(placement.locationName);
    }
    if (start < (soonestStart.get(placement.workerId) ?? Number.POSITIVE_INFINITY)) {
      soonestStart.set(placement.workerId, start);
      candidate.stage = placement.stage;
    }
    candidate.isPlaced ||= isPlaced(placement.stage);
    byWorker.set(placement.workerId, candidate);
  }
  return [...byWorker.values()].sort((a, b) => Number(b.isPlaced) - Number(a.isPlaced) || a.name.localeCompare(b.name));
}
