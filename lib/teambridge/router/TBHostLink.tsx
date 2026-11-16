'use client';

import { useSyncExternalStore, type ComponentProps } from 'react';

/**
 * The origin of the Teambridge page around the iframe, or null when the app
 * isn't embedded (dev mode) or the browser doesn't say. It is not the
 * proxy's origin the app is served from, so it has to come from the browser:
 * `location.ancestorOrigins` (Chromium, Safari), else the referrer the host
 * page sent when it loaded the iframe.
 */
function hostOrigin(): string | null {
  if (window.parent === window) return null;
  const ancestor = window.location.ancestorOrigins?.[0];
  if (ancestor) return ancestor;
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
}

const noSubscription = () => () => {};

/**
 * A link to a page of the Teambridge web app itself (`path` on the host's
 * origin, e.g. `appLibrarySetupPath(slug)` from `@/lib/teambridge/host`),
 * not to a page of this app.
 *
 * It opens in a new tab. The host sandboxes the iframe without
 * `allow-top-navigation`, so a `target="_top"` link would be blocked, and
 * `TBRouter`'s messages only carry app-local paths; `allow-popups` is
 * granted, so a new tab works. Without a known host origin (standalone dev
 * mode) it renders its children as plain text.
 */
export function TBHostLink({
  path,
  children,
  ...props
}: Omit<ComponentProps<'a'>, 'href' | 'target' | 'rel'> & { path: string }) {
  const origin = useSyncExternalStore(noSubscription, hostOrigin, () => null);
  if (!origin) return <span>{children}</span>;
  return (
    <a {...props} href={`${origin}${path}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
