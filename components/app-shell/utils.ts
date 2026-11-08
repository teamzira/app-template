import type { CSSProperties } from 'react';
import type { AppAccent, AppBrand, AppFolder, AppNavItem, AppSection } from './types';

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

/**
 * `--app-accent` is always set, so links can use `text-(--app-accent)`; the override of Alloy's
 * fills (accent.css) only switches on for a non-default accent.
 */
export const getAccentClasses = (accent: AppAccent = 'default'): string =>
  accent === 'default' ? ACCENT_VAR_CLASSES.default : `${ACCENT_VAR_CLASSES[accent]} app-shell-accent`;

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const INK_LIGHT = '#ffffff';
const INK_DARK = '#151515';

/** White or Alloy's near-black, whichever reads better on `background`. */
export const readableInk = (background: string): string =>
  contrast(background, INK_LIGHT) >= contrast(background, INK_DARK) ? INK_LIGHT : INK_DARK;

/**
 * The shell's colour classes and variables, for its root and for <body> (where Alloy portals
 * dialogs). A brand sets `--app-accent` itself, plus `--app-brand` and the ink readable on it.
 */
export const getShellTheme = ({ accent, brand }: { accent?: AppAccent; brand?: AppBrand }) => {
  if (!brand) return { className: getAccentClasses(accent), style: undefined };
  const ink = readableInk(brand.color);
  const style = {
    '--app-accent': brand.color,
    '--app-brand': brand.color,
    '--app-brand-ink': ink,
    // The band deepens away from its ink, so the ink keeps its contrast across it.
    '--app-brand-deep': `color-mix(in srgb, ${brand.color} 45%, ${ink === INK_LIGHT ? INK_DARK : INK_LIGHT})`,
  } as CSSProperties;
  return { className: 'app-shell-accent app-shell-brand', style };
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
