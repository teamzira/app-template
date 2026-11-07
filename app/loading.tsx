import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for every section, shown at once on in-app navigations while the reads run. */
export default function SchedulingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-10">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
