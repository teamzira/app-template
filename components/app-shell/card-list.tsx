import type { ReactNode } from 'react';

/**
 * A list of AlloyListItem rows inside an `alloy-chart-card`, edge to edge: it reaches the card's
 * sides, so a row's hover and divider run its full width. Give each row `{...cardRow(size)}`, so
 * its content keeps the card's 20px gutter and lines up with the card's title.
 */
export function CardList({ children }: { children: ReactNode }) {
  return <ul className="-mx-5 flex flex-col">{children}</ul>;
}

/** The card's gutter in place of the row's own padding, keeping the row tier's vertical padding. */
export const cardRow = (size: 'medium' | 'large' = 'large') =>
  ({ padding: 'none', className: size === 'large' ? 'px-5 py-3' : 'px-5 py-2.5' }) as const;
