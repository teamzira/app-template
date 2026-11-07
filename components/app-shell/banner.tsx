'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import { formatBannerDate, formatGreeting } from './utils';

/**
 * The only banner an app may show, as the first block of its landing page. Content in, look
 * fixed: no slot takes an image, logo, badge or colour, so every app's banner reads the same.
 */
type Props =
  | {
      kind: 'greeting';
      /** Who is signed in, as Teambridge names them. */
      name: string;
      /** One sentence on what needs attention today. */
      summary?: string;
    }
  | {
      kind: 'announcement';
      title: string;
      message: string;
      /** One button, `style="tertiary"`. */
      action?: ReactNode;
      onDismiss?: () => void;
    };

// The server renders in its own time zone, so the date and greeting come from the browser: none
// on the server, the page's load time on the client (cached, as useSyncExternalStore requires).
let loadedAt: Date | null = null;
const subscribeToNothing = () => () => {};
const getLoadedAt = () => (loadedAt ??= new Date());
const getServerTime = () => null;

export function AppBanner(props: Props) {
  const now = useSyncExternalStore(subscribeToNothing, getLoadedAt, getServerTime);

  if (props.kind === 'announcement') {
    return (
      <AlloyAlert
        variant="info"
        title={props.title}
        actions={props.action}
        actionsPlacement="trailing"
        isDismissible={!!props.onDismiss}
        onDismiss={props.onDismiss}
      >
        {props.message}
      </AlloyAlert>
    );
  }

  return (
    <section className="alloy-chart-card alloy-chart-card-secondary">
      <div className="flex flex-col gap-1">
        {/* Holds its height before the browser fills it in, so the page doesn't shift. */}
        <p className="m-0 min-h-5 alloy-paragraph-s text-alloy-slate-500">
          {now && formatBannerDate(now)}
        </p>
        <p className="m-0 min-h-7 alloy-heading-s-semibold text-alloy-mono-1000">
          {now && formatGreeting(now, props.name)}
        </p>
        {props.summary && (
          <p className="m-0 alloy-paragraph-m text-alloy-slate-600">{props.summary}</p>
        )}
      </div>
    </section>
  );
}
