import type { WrappedIcon } from '@teamzira/alloy/icons-js/_runtime';

export type AppSectionNavStyle = 'sidebar' | 'tabs';

export type AppNavStyle = AppSectionNavStyle | 'none';

/** One page of the app, reached at `href` (app-local, e.g. `/reports/`). */
export interface AppSection {
  href: string;
  label: string;
  /** The icon component, not an element: a sidebar row draws `.Raw`, a tab the 16px form. */
  icon?: WrappedIcon;
}

/** A collapsible group of sections in the sidebar. One level only. */
export interface AppFolder {
  key: string;
  label: string;
  icon?: WrappedIcon;
  sections: AppSection[];
}

export type AppNavItem = AppSection | AppFolder;

/** The account's colour, from the Alloy hues that keep white text readable on a button. */
export type AppAccent =
  | 'default'
  | 'blue'
  | 'azure'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'green';

interface AppShellBaseConfig {
  /** Recolours the primary buttons and the selected tab's underline; `default` keeps Alloy black. */
  accent?: AppAccent;
}

/** A one-page app lists no sections; only a sidebar takes folders. */
export type AppShellConfig =
  | (AppShellBaseConfig & { navStyle: 'none' })
  | (AppShellBaseConfig & { navStyle: 'tabs'; sections: AppSection[] })
  | (AppShellBaseConfig & { navStyle: 'sidebar'; sections: AppNavItem[] });
