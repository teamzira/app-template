/**
 * One sample app, running in the browser: the sample's own AppShell and pages, with the route
 * matched from the in-memory location. Pages are the samples' async server components; the
 * preview calls them like functions and renders what they return.
 */
import { startTransition, Suspense, use, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '@/components/app-shell/app-shell';
import { currentLocation, subscribeToLocation } from 'next/navigation';
import { routes } from 'preview-app-routes';
import { HostHeader } from './host-header';

declare const __PREVIEW_APP__: string;
declare const __PREVIEW_LABEL__: string;

type SearchParams = Record<string, string>;
export type PreviewRoutes = Record<string, (props: { searchParams: Promise<SearchParams> }) => Promise<ReactNode> | ReactNode>;

const pages = new Map<string, Promise<ReactNode>>();

function loadPage(pathname: string, search: string): Promise<ReactNode> {
  const key = `${pathname}${search}`;
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

  // Teambridge's header spans the iframe's full width; the app, its sidebar included, sits below.
  return (
    <div className="flex h-full flex-col">
      <HostHeader appName={__PREVIEW_LABEL__} />
      <div className="min-h-0 flex-1">
        <AppShell showSettings={false}>{page}</AppShell>
      </div>
    </div>
  );
}

const container = document.getElementById(`app-${__PREVIEW_APP__}`);
if (container) createRoot(container).render(<PreviewApp />);
