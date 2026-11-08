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

/**
 * A branded app: the account's own colour as a band behind every page's title, a tint behind the
 * content, and in place of `accent` everywhere it reaches. For an app an account's own people and
 * clients open, where looking like the company matters more than looking like Teambridge.
 */
export interface AppBrand {
  /** The company's name as it writes it, shown in the band above each page's title. */
  name: string;
  /** The brand's main colour, `#rrggbb`, from its site or brand guide. */
  color: `#${string}`;
}

interface AppShellBaseConfig {
  /** Recolours the primary buttons and the selected tab's underline; `default` keeps Alloy black. */
  accent?: AppAccent;
  /** Turns the app into a branded one; `accent` is then ignored. */
  brand?: AppBrand;
}

/** A one-page app lists no sections; only a sidebar takes folders. */
export type AppShellConfig =
  | (AppShellBaseConfig & { navStyle: 'none' })
  | (AppShellBaseConfig & { navStyle: 'tabs'; sections: AppSection[] })
  | (AppShellBaseConfig & { navStyle: 'sidebar'; sections: AppNavItem[] });
