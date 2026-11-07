'use client';

import { cn } from '@/lib/utils';
import type { Shift } from '../shared/types';
import { timeFormat } from '../shared/use-is-browser';
import { toDayKey } from './month';

type Props = {
  weeks: Date[][];
  month: number;
  todayKey: string;
  selectedKey: string;
  shiftsByDay: Map<string, Shift[]>;
  onSelectDay: (dayKey: string) => void;
  onOpenShift: (shiftId: string) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHIPS_PER_DAY = 3;

// The dot uses AlloyStatusTag's colours, so the legend's tags read as the key.
const DOT = {
  open: 'bg-alloy-orange-500',
  filled: 'bg-alloy-green-600',
};

/**
 * Stand-in for AlloyCalendarMonth until it ships in Alloy: a 7-column grid of bordered day cells,
 * a today marker, up to three event chips a day and "+N more", which selects the day. Chips show
 * the start time only where the cells are wide enough to keep the name; on a phone they give way to
 * a count, and the selected day's shifts are in the panel below.
 */
export function CalendarMonth({ weeks, month, todayKey, selectedKey, shiftsByDay, onSelectDay, onOpenShift }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--color-border-opaque)]">
      <div className="grid grid-cols-7 border-b border-[color:var(--color-border-opaque)] bg-alloy-slate-50">
        {WEEKDAYS.map((day) => (
          <div key={day} className="alloy-label-s px-2 py-2 text-alloy-slate-500">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={toDayKey(week[0])} className="grid grid-cols-7 border-b border-[color:var(--color-border-opaque)] last:border-b-0">
          {week.map((date) => {
            const key = toDayKey(date);
            const shifts = shiftsByDay.get(key) ?? [];
            const isOtherMonth = date.getMonth() !== month;
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const openCount = shifts.filter((s) => !s.assigneeId).length;
            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-16 min-w-0 flex-col gap-1 border-r border-[color:var(--color-border-opaque)] p-1 last:border-r-0 sm:min-h-28 sm:p-1.5',
                  isOtherMonth && 'bg-alloy-slate-50',
                  isSelected && 'ring-2 ring-inset ring-alloy-mono-1000'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(key)}
                  aria-label={`${date.toDateString()}, ${shifts.length} shifts`}
                  aria-pressed={isSelected}
                  className={cn(
                    'alloy-label-s flex size-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alloy-blue-500',
                    isToday ? 'bg-alloy-mono-1000 text-white' : isOtherMonth ? 'text-alloy-slate-400' : 'text-alloy-mono-1000 hover:bg-alloy-slate-100'
                  )}
                >
                  {date.getDate()}
                </button>

                {shifts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(key)}
                    className="alloy-caption-m flex items-center gap-1 px-1 text-alloy-slate-500 sm:hidden"
                  >
                    <span className={cn('size-1.5 rounded-full', openCount > 0 ? DOT.open : DOT.filled)} />
                    {shifts.length}
                  </button>
                )}

                <div className="hidden flex-col gap-1 sm:flex">
                  {shifts.slice(0, CHIPS_PER_DAY).map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => onOpenShift(shift.id)}
                      title={`${timeFormat.format(new Date(shift.start))} · ${shift.assigneeId ? (shift.assigneeName ?? 'Unnamed') : 'Open'}`}
                      className="alloy-caption-m flex min-w-0 items-center gap-1.5 rounded-md border border-[color:var(--color-border-opaque)] bg-white px-1.5 py-0.5 text-left hover:border-[color:var(--color-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alloy-blue-500"
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', shift.assigneeId ? DOT.filled : DOT.open)} />
                      <span className="hidden shrink-0 text-alloy-slate-500 2xl:inline">{timeFormat.format(new Date(shift.start))}</span>
                      <span className="truncate">{shift.assigneeId ? (shift.assigneeName ?? 'Unnamed') : 'Open'}</span>
                    </button>
                  ))}
                  {shifts.length > CHIPS_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => onSelectDay(key)}
                      className="alloy-caption-m px-1.5 text-left text-alloy-slate-500 hover:text-alloy-mono-1000"
                    >
                      +{shifts.length - CHIPS_PER_DAY} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
