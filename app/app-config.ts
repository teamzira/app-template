import BarChart10Icon from '@teamzira/alloy/icons-js/Charts/BarChart10Icon';
import CalendarIcon from '@teamzira/alloy/icons-js/Time/CalendarIcon';
import UserPlus01Icon from '@teamzira/alloy/icons-js/User/UserPlus01Icon';
import type { AppShellConfig } from '@/components/app-shell/types';

/**
 * How this app is laid out inside Teambridge: its nav (`sidebar`, `tabs` or `none` for one page),
 * its sections, and the account's accent colour. See .claude/skills/teambridge-app-shell.
 */
export const appConfig: AppShellConfig = {
  navStyle: 'sidebar',
  accent: 'purple',
  sections: [
    { href: '/', label: 'Schedule', icon: CalendarIcon },
    { href: '/open-shifts/', label: 'Open shifts', icon: UserPlus01Icon },
    {
      key: 'reports',
      label: 'Reports',
      icon: BarChart10Icon,
      sections: [
        { href: '/reports/hours/', label: 'Hours report' },
        { href: '/reports/attendance/', label: 'Attendance report' },
      ],
    },
  ],
};
