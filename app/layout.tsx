import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TBProvider, TBRouter, TBRecordEditWatcher } from '@/lib/teambridge';
import { settingsEnabled } from '@/lib/teambridge/setup';
import { AppNav } from './nav';
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TBProvider>
          {/* Keeps the parent Teambridge URL in sync with this iframe. */}
          <TBRouter />
          {/* Re-renders after a record is edited in the host's record detail panel. */}
          <TBRecordEditWatcher />
          {/* Section nav beside the content; `h-dvh` is the iframe's height, so only <main> scrolls. */}
          <div className="flex min-h-0 flex-col md:h-dvh md:flex-row">
            {/* No Settings link on a deployment that can't save settings (no database in production). */}
            <AppNav showSettings={settingsEnabled()} />
            <main className="min-w-0 flex-1 md:overflow-y-auto">{children}</main>
          </div>
        </TBProvider>
      </body>
    </html>
  );
}
