'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AlloyAlert from '@teamzira/alloy/components/alert/AlloyAlert';
import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton';
import AlloyDialog from '@teamzira/alloy/components/dialog/AlloyDialog';
import AlloyDateField from '@teamzira/alloy/components/input/AlloyDateField';
import AlloyNumberField from '@teamzira/alloy/components/input/AlloyNumberField';
import AlloySelectField from '@teamzira/alloy/components/input/AlloySelectField';
import AlloyTextField from '@teamzira/alloy/components/input/AlloyTextField';
import PlusIcon from '@teamzira/alloy/icons-js/General/PlusIcon';
import { createJobOrder } from './actions';
import type { Option } from './types';

type Props = {
  locations: Option[];
  roles: Option[];
};

type Draft = {
  name: string;
  locationId: string | undefined;
  roleId: string | undefined;
  start: Date | undefined;
  end: Date | undefined;
  hourlyRate: string;
};

const EMPTY: Draft = { name: '', locationId: undefined, roleId: undefined, start: undefined, end: undefined, hourlyRate: '' };

/** The page's one primary action: a dialog that creates a job order in Teambridge's Jobs. */
export function NewJobOrder({ locations, roles }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const close = () => {
    setIsOpen(false);
    setDraft(EMPTY);
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createJobOrder({
        name: draft.name,
        locationId: draft.locationId ?? '',
        roleId: draft.roleId ?? null,
        // A picked day is the viewer's midnight; toISOString keeps that moment, with its zone.
        start: draft.start?.toISOString() ?? '',
        end: draft.end?.toISOString() ?? null,
        hourlyRate: draft.hourlyRate === '' ? null : Number(draft.hourlyRate),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <AlloyButton
        style="primary"
        size="medium"
        label="New job order"
        leadingIcon={<PlusIcon.Raw />}
        onClick={() => setIsOpen(true)}
      />
      <AlloyDialog
        isOpen={isOpen}
        onClose={close}
        title="New job order"
        size="md"
        actions={
          <>
            <AlloyButton style="tertiary" size="medium" label="Cancel" onClick={close} />
            <AlloyButton style="primary" size="medium" label="Create job order" loading={isPending} onClick={submit} />
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <AlloyAlert variant="error" density="compact" radius="md">
              {error}
            </AlloyAlert>
          )}
          <AlloyTextField
            label="Name"
            required
            placeholder="Weekend front desk cover"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
          />
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
            <AlloyDateField label="Start date" required value={draft.start ?? null} onChange={(start) => update({ start })} />
            <AlloyDateField
              label="End date"
              value={draft.end ?? null}
              minDate={draft.start}
              onChange={(end) => update({ end })}
            />
            <AlloyNumberField
              label="Hourly rate"
              min={0}
              step={0.5}
              placeholder="24.00"
              value={draft.hourlyRate}
              onChange={(e) => update({ hourlyRate: e.target.value })}
            />
          </div>
        </form>
      </AlloyDialog>
    </>
  );
}
