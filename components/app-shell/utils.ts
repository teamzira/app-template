import type { AppAccent, AppFolder, AppNavItem, AppSection } from './types';

export const isFolder = (item: AppNavItem): item is AppFolder => 'sections' in item;

/** Every section in nav order, folders opened in place: what a tab row shows. */
export const flattenSections = (items: AppNavItem[]): AppSection[] =>
  items.flatMap((item) => (isFolder(item) ? item.sections : [item]));

const trimSlash = (path: string) => path.replace(/\/+$/, '') || '/';

/** A section is current on its own path and below it; Home (`/`) only on itself. */
export const isCurrentSection = (pathname: string, href: string): boolean => {
  const current = trimSlash(pathname);
  const target = trimSlash(href);
  return current === target || (target !== '/' && current.startsWith(`${target}/`));
};

/** The current section's href, or undefined on a page no section lists. */
export const findCurrentHref = (pathname: string, sections: AppSection[]): string | undefined =>
  // The longest match wins, so `/reports/pay/` beats `/reports/`.
  sections
    .filter((section) => isCurrentSection(pathname, section.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

// Sets `--app-accent` on the shell. Literal classes, since Tailwind only generates what it finds.
// Orange and green step down to -700: their -600 fills give white text under 4.5:1.
export const ACCENT_VAR_CLASSES: Record<AppAccent, string> = {
  default: '[--app-accent:var(--color-alloy-mono-1000)]',
  blue: '[--app-accent:var(--color-alloy-blue-600)]',
  azure: '[--app-accent:var(--color-alloy-azure-600)]',
  purple: '[--app-accent:var(--color-alloy-purple-600)]',
  pink: '[--app-accent:var(--color-alloy-pink-600)]',
  red: '[--app-accent:var(--color-alloy-red-600)]',
  orange: '[--app-accent:var(--color-alloy-orange-700)]',
  green: '[--app-accent:var(--color-alloy-green-700)]',
};

export type GreetingPart = 'morning' | 'afternoon' | 'evening';

/** Morning from 5am, afternoon from noon, evening from 5pm through the night. */
export const getGreetingPart = (date: Date): GreetingPart => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
};

export const formatGreeting = (date: Date, name: string): string =>
  `Good ${getGreetingPart(date)}, ${name}`;

/** "Friday, November 6": the banner sits on today's page, so the year adds nothing. */
export const formatBannerDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
