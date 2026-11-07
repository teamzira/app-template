import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for the Timesheets page, shown at once on in-app navigations while its reads run. */
export default function TimesheetLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-10">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {[0, 1].map((card) => (
        <div key={card} className="alloy-chart-card flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
