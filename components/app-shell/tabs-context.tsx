'use client';

import { createContext, useContext, type ReactNode } from 'react';

type AppTabs = {
  /** The tab row the page draws under its title, or null for no tabs. */
  tabs: ReactNode;
  /** A sidebar app's tabs only stand in for the rail on a phone. */
  isPhoneOnly: boolean;
  /** Set for a one-page app with settings, which has no nav to put them in. */
  settingsHref?: string;
};

const AppTabsContext = createContext<AppTabs>({ tabs: null, isPhoneOnly: false });

export const AppTabsProvider = AppTabsContext.Provider;

export const useAppTabs = (): AppTabs => useContext(AppTabsContext);
