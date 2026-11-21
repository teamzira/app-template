'use client';

import { useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AlloyTabs from '@teamzira/alloy/components/tabs/AlloyTabs';
import type { AppSection } from './types';
import { findCurrentHref } from './utils';

const subscribeToNothing = () => () => {};

/** Sections as tabs, under the page title. On a phone AlloyTabs collapses them into a dropdown. */
export function AppTabNav({ sections }: { sections: AppSection[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = findCurrentHref(pathname, sections) ?? '';
  // AlloyTabs chooses its row or its phone dropdown from the window's width, which the server
  // doesn't have, so it renders in the browser only; the placeholder holds its height meanwhile.
  const isBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!isBrowser) return <div aria-hidden className="h-12 border-b border-alloy-slate-100" />;

  return (
    // `app-tab-nav` lets accent.css reach the overflow menu's underline.
    <div className="app-tab-nav">
      <AlloyTabs
        variant="underline"
        value={current}
        onChange={(href) => router.push(href)}
        aria-label="App sections"
        // Flush with the page column it sits in; the collapsed dropdown brings its own inset.
        tablistClassName="px-0"
      >
        {sections.map((section) => (
          <AlloyTabs.Tab
            key={section.href}
            value={section.href}
            leadingIcon={section.icon && <section.icon size={16} />}
          >
            {section.label}
          </AlloyTabs.Tab>
        ))}
      </AlloyTabs>
    </div>
  );
}
