import type { ReactNode } from 'react';

/**
 * A list of AlloyListItem rows inside an `alloy-chart-card`, edge to edge: it reaches the card's
 * sides and bottom, so a row's hover and divider run its full width and the last row sits on the
 * card's edge. Its bottom corners follow the card's (12px, less the 1px border) so a hover doesn't
 * square them off. Give each row `{...cardRow(size)}`, so its content keeps the card's 20px gutter
 * and lines up with the card's title, and turn the last row's divider off.
 */
export function CardList({ children }: { children: ReactNode }) {
  return <ul className="-mx-5 -mb-5 flex flex-col overflow-hidden rounded-b-[11px]">{children}</ul>;
}

/**
 * The card's gutter in place of the row's own padding, keeping the row tier's vertical padding.
 * The leading slot shrinks to its avatar or icon, left-aligned: Alloy centres it in a 36–48px box,
 * which would set it in from the card's title. (AlloyListItem joins classes without merging them,
 * hence the important modifiers.)
 */
export const cardRow = (size: 'medium' | 'large' = 'large') =>
  ({
    padding: 'none',
    className: size === 'large' ? 'px-5 py-3' : 'px-5 py-2.5',
    leadingSlotClassName: 'min-w-0! justify-start!',
  }) as const;
