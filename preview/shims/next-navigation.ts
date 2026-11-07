/**
 * Stands in for `next/navigation` in the preview. Each sample bundle gets its own copy, so each
 * keeps its own in-memory location; the page around them can't carry paths or queries in its URL.
 */
import { useMemo, useSyncExternalStore } from 'react';

type Location = { pathname: string; search: string };

let location: Location = { pathname: '/', search: '' };
const listeners = new Set<() => void>();

export function navigate(href: string): void {
  const url = new URL(href, `https://preview.local${location.pathname}${location.search}`);
  location = { pathname: url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`, search: url.search };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocation(): Location {
  return useSyncExternalStore(
    subscribe,
    () => location,
    () => location
  );
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const router = {
  push: (href: string) => navigate(href),
  replace: (href: string) => navigate(href),
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function unstable_rethrow(_error?: unknown): void {}

export function redirect(href: string): never {
  navigate(href);
  throw new Error(`Redirected to ${href}`);
}

// The page around the bundles turns `history.replaceState(…, '?day=…')` (how the samples set view
// state without a server round trip) into this event for whichever sample is on screen.
declare const __PREVIEW_APP__: string;
window.addEventListener('preview:history', (event) => {
  const { app, url } = (event as CustomEvent<{ app: string; url: string }>).detail;
  if (app === __PREVIEW_APP__) navigate(url);
});

export function subscribeToLocation(listener: () => void): () => void {
  return subscribe(listener);
}

export function currentLocation(): Location {
  return location;
}
