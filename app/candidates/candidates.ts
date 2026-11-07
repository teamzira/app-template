import { isPlaced, type Placement } from '../jobs/types';

export interface Candidate {
  id: string;
  name: string;
  jobNames: string[];
  locations: string[];
  /** A placed stage if they're placed anywhere; otherwise the stage of their soonest placement. */
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
      stage: null,
      isPlaced: false,
    };
    if (placement.jobName && !candidate.jobNames.includes(placement.jobName)) candidate.jobNames.push(placement.jobName);
    if (placement.locationName && !candidate.locations.includes(placement.locationName)) {
      candidate.locations.push(placement.locationName);
    }
    if (isPlaced(placement.stage)) {
      // Placed anywhere is the status that matters, whatever their other placements say.
      if (!candidate.isPlaced) candidate.stage = placement.stage;
      candidate.isPlaced = true;
    } else if (!candidate.isPlaced && start < (soonestStart.get(placement.workerId) ?? Number.POSITIVE_INFINITY)) {
      soonestStart.set(placement.workerId, start);
      candidate.stage = placement.stage;
    }
    byWorker.set(placement.workerId, candidate);
  }
  return [...byWorker.values()].sort((a, b) => Number(b.isPlaced) - Number(a.isPlaced) || a.name.localeCompare(b.name));
}
