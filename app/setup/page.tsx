/**
 * The setup page: where an admin chooses which collections and fields this
 * app uses on their account. Teambridge opens it right after install when
 * the account needs it (the install hook returns `setupPath`), `requireSetup`
 * sends users here while a required slot is unresolved, and the Settings
 * link in the nav brings an admin back to change a choice later.
 *
 * It is generic over `app/schema.ts`: each collection in the spec becomes a
 * card, each field a picker filtered by the spec's `type`, preselected with
 * the account's saved choice or, for a slot not set yet, a good-faith guess
 * by name (`guessBindings`). What the admin saves is ids.
 *
 * Anyone who can open the app can open this page: no role or permission
 * reaches the app from Teambridge yet, so there is nothing to check against.
 */
import { AlertCircleIcon, AlertTriangleIcon } from 'lucide-react';
import {
  getAppCredentials,
  getTBClient,
  getTBContext,
  TBApiError,
  type Collection,
  type TBClient,
} from '@/lib/teambridge';
import { configStore } from '@/lib/teambridge/config-store';
import { guessBindings, type CollectionSpec, type SchemaBindings } from '@/lib/teambridge/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { schema } from '../schema';
import {
  SetupForm,
  type CollectionOption,
  type CollectionSlot,
  type FieldSlot,
  type ValueSource,
} from './setup-form';

export default async function SetupPage() {
  const { accountId } = await getTBContext();

  if (!getAppCredentials()) {
    return (
      <SetupShell>
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>Configuration required</AlertTitle>
          <AlertDescription>
            No app credentials found. Set{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_ID</code> and{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">TB_CLIENT_SECRET</code> in your{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code>.
          </AlertDescription>
        </Alert>
      </SetupShell>
    );
  }

  let error: string | null = null;
  let collections: CollectionOption[] = [];
  let slots: CollectionSlot[] = [];
  let savedAt: string | null = null;

  try {
    // Account structure, so the app's own access — and fresh reads rather
    // than the cached resolution: an admin who has just added a field in
    // Teambridge opens this page expecting to see it in the picker.
    const client = getTBClient({ accountId });
    const [all, config] = await Promise.all([client.collections.list(), configStore.get(accountId)]);
    // Saved choices stay; slots not set yet get the good-faith guess by name.
    const guessed = await guessBindings(client, schema, config?.bindings);
    slots = await Promise.all(
      Object.entries(schema).map(([key, spec]) =>
        buildSlot(client, key, spec, all, config?.bindings?.[key], guessed[key])
      )
    );
    collections = all.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    savedAt = config?.updatedAt ?? null;
  } catch (e) {
    console.error('[Setup] loading collections', e);
    error =
      e instanceof TBApiError && e.isNotInstalled
        ? "This app isn't installed on this account. Install it from the App Library, then reload."
        : "Couldn't load this account's collections. Try again, and if it keeps happening check the app's installation.";
  }

  return (
    <SetupShell>
      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Couldn&apos;t load settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <SetupForm collections={collections} slots={slots} savedAt={savedAt} />
      )}
    </SetupShell>
  );
}

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the collections and fields this app reads and writes on this account. Anything marked
          required has to be set before the app can run; the rest switches a feature on or off.
        </p>
      </div>
      {children}
    </div>
  );
}

type Binding = NonNullable<SchemaBindings[string]>;

/**
 * One collection of the spec as the form shows it: the collection the
 * account has chosen (or the guess picked), its fields, and the current value
 * of each field slot. A saved id that no longer exists shows as `stale`.
 */
async function buildSlot(
  client: TBClient,
  key: string,
  spec: CollectionSpec,
  all: Collection[],
  binding: Binding | undefined,
  guess: Binding | undefined
): Promise<CollectionSlot> {
  const findCollection = (id: string) => all.find((collection) => collection.id === id) ?? null;
  let selected: Collection | null = null;
  let source: ValueSource = 'none';
  if (binding?.id !== undefined) {
    // A saved choice: an id, or null for "Not used".
    selected = binding.id ? findCollection(binding.id) : null;
    source = binding.id && !selected ? 'stale' : 'saved';
  } else if (guess?.id) {
    selected = findCollection(guess.id);
    source = selected ? 'guessed' : 'none';
  }

  const fields = selected ? await client.collections.getFields(selected.id) : [];

  const fieldSlots: FieldSlot[] = Object.entries(spec.fields).map(([fieldKey, fieldSpec]) => {
    const types = fieldSpec.type ? [fieldSpec.type].flat() : null;
    const usable = (fieldId: string) =>
      fields.some((field) => field.id === fieldId && (!types || types.includes(field.type)));
    const bound = binding?.fields?.[fieldKey];
    let selectedId: string | null = null;
    let fieldSource: ValueSource = 'none';
    if (selected && bound !== undefined) {
      selectedId = bound && usable(bound) ? bound : null;
      fieldSource = bound && !selectedId ? 'stale' : 'saved';
    } else if (selected) {
      const guessedId = guess?.fields?.[fieldKey];
      if (guessedId && usable(guessedId)) {
        selectedId = guessedId;
        fieldSource = 'guessed';
      }
    }
    return {
      key: fieldKey,
      label: fieldSpec.name,
      types,
      required: Boolean(fieldSpec.required),
      selectedId,
      source: fieldSource,
    };
  });

  return {
    key,
    label: spec.name,
    required: spec.required ?? true,
    selectedId: selected?.id ?? null,
    source,
    fields: fields.map(({ id, name, type }) => ({ id, name, type })),
    fieldSlots,
  };
}
