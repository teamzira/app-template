import CalendarIcon from '@teamzira/alloy/icons-js/Time/CalendarIcon';
import Home02Icon from '@teamzira/alloy/icons-js/General/Home02Icon';
import Users01Icon from '@teamzira/alloy/icons-js/User/Users01Icon';
import type { AppShellConfig } from '@/components/app-shell/types';

/**
 * How this app is laid out inside Teambridge: its nav (`sidebar`, `tabs` or `none` for one page),
 * its sections, and the account's accent colour. See .claude/skills/teambridge-app-shell.
 */
export const appConfig: AppShellConfig = {
  navStyle: 'tabs',
  accent: 'pink',
  sections: [
    { href: '/', label: 'Overview', icon: Home02Icon },
    { href: '/schedule/', label: 'Schedule', icon: CalendarIcon },
    { href: '/staff/', label: 'Staff', icon: Users01Icon },
  ],
};
