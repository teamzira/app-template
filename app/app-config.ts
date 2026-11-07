import Briefcase01Icon from '@teamzira/alloy/icons-js/Education/Briefcase01Icon';
import UserCheck01Icon from '@teamzira/alloy/icons-js/User/UserCheck01Icon';
import type { AppShellConfig } from '@/components/app-shell/types';

/**
 * How this app is laid out inside Teambridge: its nav (`sidebar`, `tabs` or `none` for one page),
 * its sections, and the account's accent colour. See .claude/skills/teambridge-app-shell.
 */
export const appConfig: AppShellConfig = {
  navStyle: 'tabs',
  accent: 'purple',
  sections: [
    { href: '/', label: 'Job orders', icon: Briefcase01Icon },
    { href: '/placements/', label: 'Placements', icon: UserCheck01Icon },
  ],
};
