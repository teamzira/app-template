/** A month as `YYYY-MM`, the form it takes in the URL. */
export type MonthKey = string;

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonth(value: string | undefined): { year: number; month: number } | null {
  const match = value ? MONTH_KEY.exec(value) : null;
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
}

export function toMonthKey(year: number, month: number): MonthKey {
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** A local calendar day as `YYYY-MM-DD`. */
export function toDayKey(date: Date): string {
  return `${toMonthKey(date.getFullYear(), date.getMonth())}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The weeks shown for a month: Sunday to Saturday, from the week holding the 1st to the one holding the last day. */
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const cursor = new Date(year, month, 1 - first.getDay());
  const weeks: Date[][] = [];
  while (weeks.length === 0 || cursor.getMonth() === month) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
