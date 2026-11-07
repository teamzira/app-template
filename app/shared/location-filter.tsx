'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AlloySelectField from '@teamzira/alloy/components/input/AlloySelectField';
import type { Location } from './types';

type Props = {
  locations: Location[];
  locationId: string | null;
};

const ALL = 'all';

/** The page-level location filter, kept in the URL so it survives a reload or a shared link. */
export function LocationFilter({ locations, locationId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const options = [{ value: ALL, label: 'All locations' }, ...locations.map((l) => ({ value: l.id, label: l.name }))];

  const handleChange = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete('location');
    else params.set('location', value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <AlloySelectField
      aria-label="Location"
      size="medium"
      className="w-40 sm:w-48"
      options={options}
      value={locationId ?? ALL}
      onChange={handleChange}
    />
  );
}
