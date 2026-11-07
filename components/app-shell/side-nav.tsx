'use client';

import { Fragment, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem';
import AlloySecondaryNav from '@teamzira/alloy/components/navigation/secondary/AlloySecondaryNav';
import type { AppFolder, AppNavItem, AppSection } from './types';
import { findCurrentHref, flattenSections, isFolder } from './utils';

type Props = {
  items: AppNavItem[];
  /** Settings, at the foot of the rail apart from the day-to-day sections. */
  settings?: AppSection;
};

/**
 * The sidebar: Alloy's secondary nav, full height on the left of the iframe. Teambridge draws the
 * app's name above the iframe, so the rail has no title row of its own.
 */
export function AppSideNav({ items, settings }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const all = [...flattenSections(items), ...(settings ? [settings] : [])];
  const current = findCurrentHref(pathname, all);
  // Folders start open; the set holds the ones the person has closed.
  const [closedFolders, setClosedFolders] = useState<ReadonlySet<string>>(new Set());

  const toggleFolder = (key: string) =>
    setClosedFolders((closed) => {
      const next = new Set(closed);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A section in a folder takes an empty leading slot, which lines its label up under the
  // folder's (AlloySecondaryNav's accordion rule), so it shows no icon of its own.
  const renderSection = (section: AppSection, isInFolder = false) => (
    <AlloyListItem
      key={section.href}
      size="xs"
      divider={false}
      leadingSlot={isInFolder ? <></> : section.icon && <section.icon.Raw />}
      label={section.label}
      selected={section.href === current}
      onClick={() => router.push(section.href)}
    />
  );

  const renderFolder = (folder: AppFolder) => {
    const isOpen = !closedFolders.has(folder.key);
    // A closed folder holding the current page shows it, so the page is never unplaced.
    const holdsCurrent = folder.sections.some((section) => section.href === current);
    return (
      <Fragment key={folder.key}>
        <AlloyListItem
          size="xs"
          divider={false}
          accordion
          accordionPosition="trailing"
          // The row is the toggle, so it carries aria-expanded; a separate chevron button
          // (onToggleExpand) would add a second tab stop and drop it.
          expanded={isOpen}
          leadingSlot={folder.icon && <folder.icon.Raw />}
          label={folder.label}
          selected={!isOpen && holdsCurrent}
          onClick={() => toggleFolder(folder.key)}
        />
        {isOpen && folder.sections.map((section) => renderSection(section, true))}
      </Fragment>
    );
  };

  return (
    <AlloySecondaryNav
      title="App sections"
      headerClassName="hidden"
      // Alloy's rail is a full-height white column with a right border; here it is a rounded
      // panel on the secondary surface. AlloySecondaryNav joins its classes without merging them,
      // so the overrides are marked important to win whatever order Tailwind emits them in.
      className="rounded-[12px]! border-0! bg-(--color-bg-secondary)! pt-2"
      bottomItems={settings ? renderSection(settings) : undefined}
    >
      {items.map((item) => (isFolder(item) ? renderFolder(item) : renderSection(item)))}
    </AlloySecondaryNav>
  );
}
