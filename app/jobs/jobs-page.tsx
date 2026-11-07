import type { ReactNode } from 'react';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import { AppPage } from '@/components/app-shell/page';
import { SetupNotice } from '@/components/setup-notice';
import type { JobOrdersData } from './data';
import { LocationFilter } from './location-filter';
import { NewJobOrder } from './new-job-order';

type Props = {
  title: string;
  description: string;
  data: JobOrdersData;
  /** Only the Job orders page carries New job order, the app's one primary action. */
  canCreate?: boolean;
  children: ReactNode;
};

/**
 * A sidebar section's page: its own title, the location filter, and on Job orders the app's one
 * primary action, New job order (it carries the account's colour). An error replaces the body.
 */
export function JobsPage({ title, description, data, canCreate = false, children }: Props) {
  return (
    <AppPage
      title={title}
      description={description}
      actions={
        <>
          {data.locations.length > 1 && <LocationFilter locations={data.locations} locationId={data.locationId} />}
          {canCreate && data.status === 'ok' && <NewJobOrder locations={data.locations} roles={data.roles} />}
        </>
      }
    >
      {data.status === 'error' ? (
        <AlloyAlert variant="error" title={`Couldn't load ${title.toLowerCase()}`}>
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
