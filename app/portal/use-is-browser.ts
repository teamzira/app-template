'use client';

import { useSyncExternalStore } from 'react';

const subscribeToNothing = () => () => {};

/**
 * False on the server and during hydration, true after. Times are shown in the viewer's zone,
 * which only the browser knows, so rows render without them first and fill them in.
 */
export function useIsBrowser(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

export const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function formatTimeRange(start: string, end: string): string {
  return `${timeFormat.format(new Date(start))} – ${timeFormat.format(new Date(end))}`;
}
