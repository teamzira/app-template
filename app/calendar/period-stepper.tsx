'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton';
import ChevronLeftIcon from '@teamzira/alloy/icons-js/Arrows/ChevronLeftIcon';
import ChevronRightIcon from '@teamzira/alloy/icons-js/Arrows/ChevronRightIcon';
import { toMonthKey } from './month';

type Props = {
  year: number;
  month: number;
  /** "November 2026", formatted by the caller. */
  label: string;
};

/**
 * Stand-in for AlloyPeriodStepper until it ships in Alloy: ‹ Today › and the month's label.
 * Moves `?month=` and drops the selected day, which belonged to the old month.
 */
export function PeriodStepper({ year, month, label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = (monthKey: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('day');
    if (monthKey) params.set('month', monthKey);
    else params.delete('month');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center gap-1">
      <AlloyButton
        style="float"
        size="medium"
        iconOnly
        aria-label="Previous month"
        leadingIcon={<ChevronLeftIcon.Raw />}
        onClick={() => goTo(toMonthKey(year, month - 1))}
      />
      <AlloyButton style="tertiary" size="medium" label="Today" onClick={() => goTo(null)} />
      <AlloyButton
        style="float"
        size="medium"
        iconOnly
        aria-label="Next month"
        leadingIcon={<ChevronRightIcon.Raw />}
        onClick={() => goTo(toMonthKey(year, month + 1))}
      />
      <span className="alloy-label-l ml-2">{label}</span>
    </div>
  );
}
