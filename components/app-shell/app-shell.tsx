'use client';

import type { ReactNode } from 'react';
import Settings01Icon from '@teamzira/alloy/icons-js/General/Settings01Icon';
import { appConfig } from '@/app/app-config';
import { cn } from '@/lib/utils';
import { AppSideNav } from './side-nav';
import { AppTabNav } from './tab-nav';
import { AppTabsProvider } from './tabs-context';
import type { AppSection } from './types';
import { ACCENT_VAR_CLASSES, flattenSections } from './utils';
import './accent.css';

type Props = {
  /** Shows Settings (the setup page) at the foot of the nav. */
  showSettings: boolean;
  children: ReactNode;
};

const SETTINGS: AppSection = { href: '/setup/', label: 'Settings', icon: Settings01Icon };

/**
 * The app's frame inside the Teambridge iframe. Teambridge draws the header (back, app name,
 * Feedback and Help) above the iframe, so the shell draws only the nav and leaves the page to
 * `AppPage`. `navStyle` in app/app-config.ts decides the nav: a full-height sidebar, tabs under the page title,
 * or none for a one-page app. A sidebar shows as tabs on a phone, where the rail has no room.
 */
// The config is imported here rather than passed in: its icons are components, which a server
// component (the layout) can't hand to a client one.
export function AppShell({ showSettings, children }: Props) {
  const config = appConfig;
  const accent = config.accent ?? 'default';
  // `--app-accent` is always set, so links can use `text-(--app-accent)`; the override of
  // Alloy's fills only switches on for a non-default accent.
  const accentClasses = cn(ACCENT_VAR_CLASSES[accent], accent !== 'default' && 'app-shell-accent');
  const settings = showSettings ? SETTINGS : undefined;

  if (config.navStyle === 'sidebar') {
    const phoneTabs = [...flattenSections(config.sections), ...(settings ? [settings] : [])];
    return (
      <div className={cn('flex h-dvh', accentClasses)}>
        {/* An inset panel under Teambridge's header, 12px clear of the iframe's edges. */}
        <div className="hidden h-full shrink-0 p-3 sm:flex">
          <AppSideNav items={config.sections} settings={settings} />
        </div>
        <AppTabsProvider value={{ tabs: <AppTabNav sections={phoneTabs} />, isPhoneOnly: true }}>
          <main className="min-w-0 flex-1">{children}</main>
        </AppTabsProvider>
      </div>
    );
  }

  const tabs =
    config.navStyle === 'tabs' ? (
      <AppTabNav sections={[...config.sections, ...(settings ? [settings] : [])]} />
    ) : null;

  return (
    <div className={cn('h-dvh', accentClasses)}>
      <AppTabsProvider
        value={{
          tabs,
          isPhoneOnly: false,
          settingsHref: config.navStyle === 'none' ? settings?.href : undefined,
        }}
      >
        <main className="h-full min-w-0">{children}</main>
      </AppTabsProvider>
    </div>
  );
}
