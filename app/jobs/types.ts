import { TagStatus } from '@teamzira/alloy/components/tags/interface';

export interface Option {
  id: string;
  name: string;
}

/** One job order, as the pages show it. Dates are ISO strings, formatted in the browser. */
export interface JobOrder {
  id: string;
  name: string;
  locationName: string | null;
  roleName: string | null;
  start: string;
  end: string | null;
  hourlyRate: number | null;
  status: string | null;
  placed: number;
  inProgress: number;
}

export interface Placement {
  id: string;
  jobName: string | null;
  locationName: string | null;
  workerName: string | null;
  start: string | null;
  stage: string | null;
}

// Job and placement statuses are each account's own select options, so they're matched by name.
// A name this doesn't know shows as itself, in grey.
const JOB_STATUS: Record<string, TagStatus> = {
  open: TagStatus.PENDING,
  active: TagStatus.PENDING,
  filling: TagStatus.PENDING,
  'on hold': TagStatus.WARNING,
  filled: TagStatus.POSITIVE,
  closed: TagStatus.INACTIVE,
  cancelled: TagStatus.INACTIVE,
};

const PLACED_STAGES = new Set(['placed', 'hired', 'active', 'started']);
const ENDED_STAGES = new Set(['rejected', 'withdrawn', 'declined', 'ended', 'cancelled']);

export function jobStatusTag(status: string | null): { label: string; status: TagStatus } {
  // A job order created without a status (as New job order does) is waiting to be worked.
  if (!status) return { label: 'New', status: TagStatus.PENDING };
  return { label: status, status: JOB_STATUS[status.trim().toLowerCase()] ?? TagStatus.INACTIVE };
}

export function stageTag(stage: string | null): { label: string; status: TagStatus } {
  if (!stage) return { label: 'No stage', status: TagStatus.INACTIVE };
  const key = stage.trim().toLowerCase();
  if (PLACED_STAGES.has(key)) return { label: stage, status: TagStatus.POSITIVE };
  if (ENDED_STAGES.has(key)) return { label: stage, status: TagStatus.INACTIVE };
  return { label: stage, status: TagStatus.PENDING };
}

export function isPlaced(stage: string | null): boolean {
  return stage !== null && PLACED_STAGES.has(stage.trim().toLowerCase());
}

export function isOpenJob(status: string | null): boolean {
  return jobStatusTag(status).status === TagStatus.PENDING;
}

export function readText(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

export function readNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
