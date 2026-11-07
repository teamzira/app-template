import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TBProvider, TBRouter, TBRecordEditWatcher } from '@/lib/teambridge';
import { settingsEnabled } from '@/lib/teambridge/setup';
import { AppShell } from '@/components/app-shell/app-shell';
import { getAccentClasses } from '@/components/app-shell/utils';
import { appConfig } from './app-config';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'My Teambridge App',
  description: 'A Teambridge external app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The accent goes on <body> as well as the shell: Alloy portals dialogs, menus and popovers
          to <body>, outside the shell, and their primary buttons should carry it too. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${getAccentClasses(appConfig.accent)}`}
      >
        <TBProvider>
          {/* Keeps the parent Teambridge URL in sync with this iframe. */}
          <TBRouter />
          {/* Re-renders after a record is edited in the host's record detail panel. */}
          <TBRecordEditWatcher />
          {/* Nav and page frame from app-config.ts. No Settings on a deployment that can't save
              settings (no database in production). */}
          <AppShell showSettings={settingsEnabled()}>
            {children}
          </AppShell>
        </TBProvider>
      </body>
    </html>
  );
}
