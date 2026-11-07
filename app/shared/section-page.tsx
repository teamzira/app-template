import type { ReactNode } from 'react';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import { AppPage } from '@/components/app-shell/page';
import { SetupNotice } from '@/components/setup-notice';
import type { ShiftsResult } from './load-shifts';
import { LocationFilter } from './location-filter';

type Props = {
  title: string;
  description: string;
  result: ShiftsResult;
  children: ReactNode;
};

/** A sidebar section's page: its own title, the location filter, and the load error in place of the body. */
export function SectionPage({ title, description, result, children }: Props) {
  return (
    <AppPage
      title={title}
      description={description}
      actions={
        result.locations.length > 1 ? <LocationFilter locations={result.locations} locationId={result.locationId} /> : undefined
      }
    >
      {result.status === 'error' ? (
        <AlloyAlert variant="error" title={`Couldn't load ${title.toLowerCase()}`}>
          {result.message}
        </AlloyAlert>
      ) : (
        <>
          <SetupNotice issues={result.issues} />
          {children}
        </>
      )}
    </AppPage>
  );
}
