/**
 * One sample app, running in the browser: the sample's own AppShell and pages, with the route
 * matched from the in-memory location. Pages are the samples' async server components; the
 * preview calls them like functions and renders what they return.
 */
import { startTransition, Suspense, use, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { appConfig } from '@/app/app-config';
import { AppShell } from '@/components/app-shell/app-shell';
import { getAccentClasses } from '@/components/app-shell/utils';
import { currentLocation, currentVersion, subscribeToLocation } from 'next/navigation';
import { routes } from 'preview-app-routes';
import { HostHeader } from './host-header';

declare const __PREVIEW_APP__: string;
declare const __PREVIEW_LABEL__: string;

type SearchParams = Record<string, string>;
export type PreviewRoutes = Record<string, (props: { searchParams: Promise<SearchParams> }) => Promise<ReactNode> | ReactNode>;

const pages = new Map<string, Promise<ReactNode>>();

function loadPage(pathname: string, search: string): Promise<ReactNode> {
  const key = `${currentVersion()}|${pathname}${search}`;
  let page = pages.get(key);
  if (!page) {
    const render = routes[pathname] ?? routes['/'];
    const searchParams = Promise.resolve(Object.fromEntries(new URLSearchParams(search)));
    page = Promise.resolve(render({ searchParams }));
    pages.set(key, page);
  }
  return page;
}

function Page({ page }: { page: Promise<ReactNode> }) {
  return use(page);
}

function PreviewApp() {
  const [location, setLocation] = useState(currentLocation);
  // Navigations are transitions, so the current page stays up while the next one renders.
  useEffect(() => subscribeToLocation(() => startTransition(() => setLocation(currentLocation()))), []);

  const page = (
    <Suspense fallback={null}>
      <Page page={loadPage(location.pathname, location.search)} />
    </Suspense>
  );

  // As in the prototype: a sidebar runs the full height and the header heads the right column;
  // tabs and one-page apps keep the header across the full width.
  if (appConfig.navStyle === 'sidebar') {
    return (
      <AppShell showSettings={false}>
        <div className="flex h-full flex-col">
          <HostHeader appName={__PREVIEW_LABEL__} />
          <div className="min-h-0 flex-1">{page}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <HostHeader appName={__PREVIEW_LABEL__} />
      <div className="min-h-0 flex-1">
        <AppShell showSettings={false}>{page}</AppShell>
      </div>
    </div>
  );
}

// In the app the layout puts the accent on <body>, where Alloy portals dialogs. Here <body> holds
// every sample, so it takes the accent of whichever one is on screen.
window.addEventListener('preview:active', (event) => {
  if ((event as CustomEvent<string>).detail === __PREVIEW_APP__) {
    document.body.className = getAccentClasses(appConfig.accent);
  }
});

const container = document.getElementById(`app-${__PREVIEW_APP__}`);
if (container) createRoot(container).render(<PreviewApp />);
