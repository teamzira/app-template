import type { ReactNode } from 'react';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import { AppPage } from '@/components/app-shell/page';
import { SetupNotice } from '@/components/setup-notice';
import type { JobOrdersData } from './data';
import { LocationFilter } from './location-filter';
import { NewJobOrder } from './new-job-order';

type Props = {
  data: JobOrdersData;
  children: ReactNode;
};

/**
 * The title block both tabs share, so switching tabs changes only the content: the location
 * filter, then New job order, the page's one primary action (it carries the account's colour).
 */
export function JobsPage({ data, children }: Props) {
  return (
    <AppPage
      title="Job orders"
      description="Roles you've asked us to fill, and who's been placed."
      actions={
        <>
          {data.locations.length > 1 && <LocationFilter locations={data.locations} locationId={data.locationId} />}
          {data.status === 'ok' && <NewJobOrder locations={data.locations} roles={data.roles} />}
        </>
      }
    >
      {data.status === 'error' ? (
        <AlloyAlert variant="error" title="Couldn't load job orders">
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
