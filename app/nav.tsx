'use client';

/**
 * The app's own section nav, inside the iframe. The host owns the global
 * navigation around it, so this stays compact: a `w-56` column on the left at
 * `md` and up, a strip across the top below that. Day-to-day sections at the
 * top; configuration (Settings) at the foot. See AGENTS.md → "Layout and
 * in-app navigation".
 *
 * Settings opens `/setup/`, prefilled with the account's current choices.
 * Anyone who can open the app can open it: no role reaches the app yet. The
 * layout passes `showSettings={settingsEnabled()}`, so a production
 * deployment without a database, which can't save settings, has no link.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: typeof HouseIcon };

const sections: NavItem[] = [{ href: '/', label: 'Home', icon: HouseIcon }];
const configuration: NavItem[] = [{ href: '/setup/', label: 'Settings', icon: SettingsIcon }];

const trimSlash = (path: string) => path.replace(/\/+$/, '') || '/';

export function AppNav({ showSettings }: { showSettings: boolean }) {
  const current = trimSlash(usePathname());

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const target = trimSlash(href);
    const active = current === target || (target !== '/' && current.startsWith(`${target}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm whitespace-nowrap text-foreground hover:bg-accent',
          active && 'bg-accent font-medium'
        )}
      >
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="App sections"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-56 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:p-3"
    >
      {sections.map(renderItem)}
      {showSettings && <div className="flex gap-1 md:mt-auto md:flex-col">{configuration.map(renderItem)}</div>}
    </nav>
  );
}
