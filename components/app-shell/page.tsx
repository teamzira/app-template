'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';
import Settings01Icon from '@teamzira/alloy/icons-js/General/Settings01Icon';
import { cn } from '@/lib/utils';
import { AppPanel, type AppPanelProps } from './panel';
import { useAppTabs } from './tabs-context';

type PageWidth = 'standard' | 'readable' | 'full';

// `standard` is the template's content width; `readable` narrows forms and settings to a line
// length people can scan; `full` lifts the cap for tool pages (a calendar, a schedule, a board).
const WIDTH_CLASSES: Record<PageWidth, string> = {
  standard: 'max-w-6xl',
  readable: 'max-w-4xl',
  full: 'max-w-none',
};

type Props = {
  title: string;
  /** Plain text, one sentence: no badges, dates or names alongside it. */
  description?: string;
  /** Buttons, or a select or two, for the whole page; the primary one last. */
  actions?: ReactNode;
  width?: PageWidth;
  /** One working panel beside the content, under the title and tabs. */
  panel?: AppPanelProps;
  children: ReactNode;
};

/**
 * The one page body every app uses, so the width, gutter and title land in the same place
 * whichever nav the app picked: 40px padding (16px on a phone) and the title as an
 * AlloySectionHeader. Teambridge's header above the iframe carries the app's name, so this is an
 * `<h2>`. A tabs app wraps all its sections in one AppPage, and the tabs sit under its title.
 */
export function AppPage({ title, description, actions, width = 'standard', panel, children }: Props) {
  const { tabs, isPhoneOnly, settingsHref } = useAppTabs();
  const router = useRouter();
  const settingsButton = settingsHref && (
    <AlloyButton
      style="float"
      size="medium"
      iconOnly
      aria-label="Settings"
      leadingIcon={<Settings01Icon.Raw />}
      onClick={() => router.push(settingsHref)}
    />
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className={cn('mx-auto flex w-full flex-col gap-5 p-4 sm:p-10', WIDTH_CLASSES[width])}>
        <AlloySectionHeader
          title={title}
          subtitle={description}
          actions={
            actions || settingsButton ? (
              <>
                {settingsButton}
                {actions}
              </>
            ) : undefined
          }
          titleAs="h2"
          // On a phone the actions go under the title, or a filter and a button squeeze it into a
          // column a word wide.
          className="max-sm:flex-col max-sm:items-stretch"
        />
        {tabs && <div className={cn(isPhoneOnly && 'sm:hidden')}>{tabs}</div>}
        {panel ? (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
            <AppPanel {...panel} />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
