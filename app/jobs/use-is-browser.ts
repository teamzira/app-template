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
