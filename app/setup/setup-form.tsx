'use client';

/**
 * The setup form: one card per collection in `app/schema.ts`, with a
 * collection picker and a field picker for each slot. It is generic over the
 * spec — the server page turns the spec into `CollectionSlot`s — so adding a
 * collection or field to the schema adds it here with no further work.
 *
 * Slots not set yet arrive prefilled with a good-faith guess by name; the
 * admin confirms or changes them, and what is saved is ids. Changing a
 * collection reloads its fields from `/api/setup/fields/` and prefills them
 * the same way. Saving goes through the `saveSetup` server action, which
 * validates and stores the bindings; the form then opens the app itself (a
 * `redirect()` inside the action would reload the whole iframe, see
 * `./actions.ts`).
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircleIcon, AlertTriangleIcon, Loader2Icon } from 'lucide-react';
import { tbFetch } from '@/lib/teambridge/fetch';
import type { SchemaBindings } from '@/lib/teambridge/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { saveSetup } from './actions';

export type CollectionOption = { id: string; name: string };
export type FieldOption = { id: string; name: string; type: string };

/**
 * Where a picker's current value came from: `saved` from the account's
 * settings, `guessed` by name for a slot not set yet, `chosen` on this page,
 * `stale` when the saved choice no longer exists, `none` when nothing is
 * selected. Only `stale` gets a hint of its own; guesses get one line at the
 * top of the form.
 */
export type ValueSource = 'saved' | 'guessed' | 'chosen' | 'stale' | 'none';

export type FieldSlot = {
  key: string;
  /** The field's name in the spec — the slot's label. */
  label: string;
  /** Types the spec allows, or null for any. The picker only offers these. */
  types: string[] | null;
  required: boolean;
  selectedId: string | null;
  source: ValueSource;
};

export type CollectionSlot = {
  key: string;
  label: string;
  required: boolean;
  selectedId: string | null;
  source: ValueSource;
  /** Every field of the selected collection; each field picker filters by type. */
  fields: FieldOption[];
  fieldSlots: FieldSlot[];
};

/** Select can't carry an empty value, so "Not used" is a sentinel. */
const NOT_USED = '__not_used';

export function SetupForm({
  collections,
  slots: initialSlots,
  savedAt,
}: {
  collections: CollectionOption[];
  slots: CollectionSlot[];
  savedAt: string | null;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Required slots without a value. The spec decides what is required; the
  // form only reports it, and the server action checks again.
  const missing = slots.flatMap((slot) => {
    if (!slot.selectedId) return slot.required ? [slot.label] : [];
    return slot.fieldSlots
      .filter((field) => field.required && !field.selectedId)
      .map((field) => `${slot.label} → ${field.label}`);
  });
  const anyLoading = Object.values(loading).some(Boolean);
  const anyGuessed = slots.some(
    (slot) => slot.source === 'guessed' || slot.fieldSlots.some((field) => field.source === 'guessed')
  );

  function updateSlot(key: string, update: (slot: CollectionSlot) => CollectionSlot) {
    setSlots((prev) => prev.map((slot) => (slot.key === key ? update(slot) : slot)));
  }

  async function changeCollection(key: string, value: string) {
    if (value === '') return; // see changeField
    const collectionId = value === NOT_USED ? null : value;
    updateSlot(key, (slot) => ({
      ...slot,
      selectedId: collectionId,
      source: 'chosen',
      fields: [],
      fieldSlots: slot.fieldSlots.map((field) => ({ ...field, selectedId: null, source: 'none' })),
    }));
    setLoadErrors((prev) => ({ ...prev, [key]: null }));
    if (!collectionId) return;

    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const query = new URLSearchParams({ collection: key, collectionId });
      const response = await tbFetch(`/api/setup/fields/?${query}`);
      const body = (await response.json().catch(() => null)) as
        | { fields: FieldOption[]; suggested?: Record<string, string | null>; error?: string }
        | null;
      if (!response.ok || !body?.fields) {
        throw new Error(body?.error || "Couldn't load this collection's fields. Try again.");
      }
      // Only apply if this is still the selected collection: the admin may
      // have changed it again while the request was in flight. Field slots
      // get the good-faith guess for the new collection.
      updateSlot(key, (slot) =>
        slot.selectedId !== collectionId
          ? slot
          : {
              ...slot,
              fields: body.fields,
              fieldSlots: slot.fieldSlots.map((field) => {
                const guessedId = body.suggested?.[field.key] ?? null;
                return { ...field, selectedId: guessedId, source: guessedId ? 'guessed' : 'none' };
              }),
            }
      );
    } catch (e) {
      setLoadErrors((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : "Couldn't load this collection's fields. Try again.",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  function changeField(key: string, fieldKey: string, value: string) {
    // Radix Select mirrors its value into a hidden native <select> and fires a
    // change event when the value changes. When a value and its options land
    // in the same render — a preselection right after the fields reload — the
    // option isn't in the native element yet, so the browser reports '' and
    // Radix passes that back here. '' is never a real choice (NOT_USED is the
    // sentinel for none), so ignore it rather than wiping the preselection.
    if (value === '') return;
    updateSlot(key, (slot) => ({
      ...slot,
      fieldSlots: slot.fieldSlots.map((field) =>
        field.key === fieldKey
          ? { ...field, selectedId: value === NOT_USED ? null : value, source: 'chosen' }
          : field
      ),
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Every slot is written: an id, or null for "Not used". A slot the spec
    // gains later has no key yet; it is `not-set` (and prefilled with a
    // guess here) until it is saved.
    const bindings: SchemaBindings = {};
    for (const slot of slots) {
      bindings[slot.key] = {
        id: slot.selectedId,
        fields: Object.fromEntries(
          slot.fieldSlots.map((field) => [field.key, slot.selectedId ? field.selectedId : null])
        ),
      };
    }
    startTransition(async () => {
      const result = await saveSetup(bindings);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Saved: open the app. Its pages resolve the schema through the new bindings.
      router.push('/');
    });
  }

  if (collections.length === 0) {
    return (
      <Alert>
        <AlertTriangleIcon />
        <AlertTitle>This account has no collections yet</AlertTitle>
        <AlertDescription>
          Create the collections this app needs in Teambridge ({slots.map((slot) => slot.label).join(', ')}),
          then reload this page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {missing.length > 0 && (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>This app needs a few things set up before it can run</AlertTitle>
          <AlertDescription>
            <p>Choose: {missing.join(', ')}.</p>
          </AlertDescription>
        </Alert>
      )}
      {anyGuessed && (
        <p className="text-sm text-muted-foreground">
          Some pickers were filled in by matching names. Check them before you save.
        </p>
      )}

      {slots.map((slot) => (
        <Card key={slot.key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              {slot.label}
              {slot.required && <RequiredBadge />}
            </CardTitle>
            <CardDescription>
              The collection this app uses as &ldquo;{slot.label}&rdquo;, and the field for each value it reads or
              writes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor={`collection-${slot.key}`}>Collection</Label>
              <Select
                value={slot.selectedId ?? (slot.required ? '' : NOT_USED)}
                onValueChange={(value) => void changeCollection(slot.key, value)}
                disabled={isPending}
              >
                <SelectTrigger id={`collection-${slot.key}`} className="w-full">
                  {/* Children render on the server too; Radix alone fills the value in after hydration. */}
                  <SelectValue placeholder="Choose a collection">
                    {slot.selectedId
                      ? (collections.find((collection) => collection.id === slot.selectedId)?.name ?? '')
                      : slot.required
                        ? undefined
                        : 'Not used'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!slot.required && <SelectItem value={NOT_USED}>Not used</SelectItem>}
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {slot.source === 'stale' && (
                <p className="text-xs text-destructive">The saved collection no longer exists. Choose another.</p>
              )}
              {loadErrors[slot.key] && <p className="text-xs text-destructive">{loadErrors[slot.key]}</p>}
            </div>

            {slot.selectedId && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {slot.fieldSlots.map((field) => (
                  <FieldPicker
                    key={field.key}
                    slot={slot}
                    field={field}
                    loading={Boolean(loading[slot.key])}
                    disabled={isPending}
                    onChange={(value) => changeField(slot.key, field.key, value)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || anyLoading || missing.length > 0}>
          {isPending && <Loader2Icon className="animate-spin" />}
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {savedAt && (
          <p className="text-xs text-muted-foreground">
            Last saved{' '}
            {/* Formatted in the viewer's locale, which the server can't know. */}
            <time dateTime={savedAt} suppressHydrationWarning>
              {new Date(savedAt).toLocaleString()}
            </time>
          </p>
        )}
      </div>
    </form>
  );
}

function FieldPicker({
  slot,
  field,
  loading,
  disabled,
  onChange,
}: {
  slot: CollectionSlot;
  field: FieldSlot;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const options = slot.fields.filter((f) => !field.types || field.types.includes(f.type));
  const selected = options.find((f) => f.id === field.selectedId) ?? null;
  const id = `field-${slot.key}-${field.key}`;
  const nothingFits = !loading && slot.fields.length > 0 && options.length === 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {field.label}
        {field.required && <RequiredBadge />}
      </Label>
      <Select
        value={field.selectedId ?? (field.required ? '' : NOT_USED)}
        onValueChange={onChange}
        disabled={disabled || loading || options.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="animate-spin" />
              Loading fields…
            </span>
          ) : (
            <SelectValue placeholder={nothingFits ? 'No matching field' : 'Choose a field'}>
              {selected ? (
                <>
                  {selected.name}
                  <span className="text-xs text-muted-foreground">{selected.type}</span>
                </>
              ) : field.required ? undefined : (
                'Not used'
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value={NOT_USED}>Not used</SelectItem>}
          {options.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
              <span className="text-xs text-muted-foreground">{f.type}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {nothingFits ? (
        <p className={cn('text-xs', field.required ? 'text-destructive' : 'text-muted-foreground')}>
          This collection has no {field.types ? field.types.join(' or ') : ''} field. Add one in Teambridge, then
          reload this page.
        </p>
      ) : (
        field.source === 'stale' && (
          <p className="text-xs text-destructive">The saved field no longer exists. Choose another.</p>
        )
      )}
    </div>
  );
}

function RequiredBadge() {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Required
    </Badge>
  );
}
