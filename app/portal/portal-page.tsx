import type { ReactNode } from 'react';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import { AppPage } from '@/components/app-shell/page';
import { SetupNotice } from '@/components/setup-notice';
import type { PortalData } from './data';
import { LocationFilter } from './location-filter';

type Props = {
  data: PortalData;
  children: ReactNode;
};

/**
 * The title block every tab shares, so switching tabs changes only the content. Each tab route
 * renders its body inside it; an error replaces the body under the same title.
 */
export function PortalPage({ data, children }: Props) {
  return (
    <AppPage
      title="Coverage"
      description="Who's on site, and what's still open."
      actions={
        data.locations.length > 1 ? <LocationFilter locations={data.locations} locationId={data.locationId} /> : undefined
      }
    >
      {data.status === 'error' ? (
        <AlloyAlert variant="error" title="Couldn't load the schedule">
          {data.message}
        </AlloyAlert>
      ) : (
        <>
          <SetupNotice issues={data.issues} />
          {children}
        </>
      )}
    </AppPage>
  );
}
