import type { AppShellConfig } from '@/components/app-shell/types';

/**
 * How this app is laid out inside Teambridge: its nav (`sidebar`, `tabs` or `none` for one page),
 * its sections, and the account's accent colour. See .claude/skills/teambridge-app-shell.
 */
export const appConfig: AppShellConfig = {
  navStyle: 'none',
  accent: 'default',
};
