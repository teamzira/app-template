import BarChart10Icon from '@teamzira/alloy/icons-js/Charts/BarChart10Icon';
import Briefcase01Icon from '@teamzira/alloy/icons-js/Education/Briefcase01Icon';
import UserCheck01Icon from '@teamzira/alloy/icons-js/User/UserCheck01Icon';
import Users01Icon from '@teamzira/alloy/icons-js/User/Users01Icon';
import type { AppShellConfig } from '@/components/app-shell/types';

/**
 * How this app is laid out inside Teambridge: its nav (`sidebar`, `tabs` or `none` for one page),
 * its sections, and the account's accent colour. See .claude/skills/teambridge-app-shell.
 */
export const appConfig: AppShellConfig = {
  navStyle: 'sidebar',
  brand: { name: 'TAG MedStaffing', color: '#0f7aa0' },
  sections: [
    { href: '/', label: 'Job orders', icon: Briefcase01Icon },
    { href: '/candidates/', label: 'Candidates', icon: Users01Icon },
    { href: '/placements/', label: 'Placements', icon: UserCheck01Icon },
    {
      key: 'reports',
      label: 'Reports',
      icon: BarChart10Icon,
      sections: [
        { href: '/reports/fill/', label: 'Fill report' },
        { href: '/reports/stages/', label: 'Pipeline report' },
      ],
    },
  ],
};
