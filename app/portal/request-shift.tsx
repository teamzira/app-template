'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton';
import AlloyDialog from '@teamzira/alloy/components/dialog/AlloyDialog';
import AlloyDateTimeField from '@teamzira/alloy/components/input/AlloyDateTimeField';
import AlloySelectField from '@teamzira/alloy/components/input/AlloySelectField';
import PlusIcon from '@teamzira/alloy/icons-js/General/PlusIcon';
import { requestShift } from './actions';
import type { PortalLocation } from './types';

type Props = {
  locations: PortalLocation[];
  roles: PortalLocation[];
  /** The location the page is filtered to, if any, so the request starts there. */
  locationId: string | null;
};

type Draft = { locationId: string | undefined; roleId: string | undefined; start: Date | undefined; end: Date | undefined };

/** The portal's one primary action: ask for another shift, which arrives as an open shift. */
export function RequestShift({ locations, roles, locationId }: Props) {
  const router = useRouter();
  const empty: Draft = { locationId: locationId ?? undefined, roleId: undefined, start: undefined, end: undefined };
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const open = () => {
    setDraft(empty);
    setError(null);
    setIsOpen(true);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestShift({
        locationId: draft.locationId ?? '',
        roleId: draft.roleId ?? null,
        // Picked in the viewer's zone; toISOString keeps that moment.
        start: draft.start?.toISOString() ?? '',
        end: draft.end?.toISOString() ?? '',
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      router.refresh();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <AlloyButton style="primary" size="medium" label="Request shift" leadingIcon={<PlusIcon.Raw />} onClick={open} />
      <AlloyDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Request a shift"
        size="md"
        actions={
          <>
            <AlloyButton style="tertiary" size="medium" label="Cancel" onClick={() => setIsOpen(false)} />
            <AlloyButton style="primary" size="medium" label="Send request" loading={isPending} onClick={submit} />
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="alloy-paragraph-m text-alloy-slate-500">
            It shows as an open shift until someone is assigned to it.
          </p>
          {error && (
            <AlloyAlert variant="error" density="compact" radius="md">
              {error}
            </AlloyAlert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AlloySelectField
              label="Location"
              required
              placeholder="Choose a location"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={draft.locationId ?? null}
              onChange={(value) => update({ locationId: value })}
            />
            <AlloySelectField
              label="Role"
              placeholder="Choose a role"
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              value={draft.roleId ?? null}
              onChange={(value) => update({ roleId: value })}
            />
            <AlloyDateTimeField label="Starts" required value={draft.start ?? null} onChange={(start) => update({ start })} />
            <AlloyDateTimeField
              label="Ends"
              required
              value={draft.end ?? null}
              minDate={draft.start}
              onChange={(end) => update({ end })}
            />
          </div>
        </form>
      </AlloyDialog>
    </>
  );
}
