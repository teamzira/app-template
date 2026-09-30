import type { CollectionSpec, FieldSpec, SchemaSpec, StandardCollection } from './schema';

/**
 * An app's install manifest: what it needs from an account, declared once.
 *
 * Teambridge's install service plans this against an account before the app
 * is installed — matching each collection and field to what the account
 * already has, offering to create what's missing — and records the admin's
 * decisions. The requirements come straight from the app's schema spec
 * (`app/schema.ts`), so the code that reads a field and the manifest that
 * installs it can't disagree.
 *
 * `yarn manifest` writes the result to `teambridge.manifest.json` (checked in,
 * so a change shows up in review), and the build fails if that file is stale.
 *
 * Requirement keys are the spec keys: `shifts` for a collection, `shifts.start`
 * for a field, `shifts.status.open` for a select option. They are the app's
 * stable names for these things — renaming a key is a new requirement to every
 * account the app is already installed in, so treat keys like an API.
 */
export interface AppManifest<S extends SchemaSpec = SchemaSpec> {
  /** The app's slug in the Teambridge app registry (the `APP_SLUG` it is served at). */
  slug: string;
  /** Shown to the admin installing the app. */
  title: string;
  /** One or two sentences on what the app does and why it needs what it needs. */
  summary: string;
  /** The collections and fields the app reads and writes — usually `schema` from `app/schema.ts`. */
  requires: S;
  /**
   * Workflow templates to install alongside the app, by template-library slug.
   * Recorded in the manifest now; the install service picks them up once it
   * supports installing an app's workflows with it.
   */
  workflows?: Array<{ template: string; required?: boolean }>;
}

export function defineAppManifest<S extends SchemaSpec>(manifest: AppManifest<S>): AppManifest<S> {
  return manifest;
}

// ---------------------------------------------------------------------------
// The install service's wire format (zserver `ai.zira.install.model`).
// ---------------------------------------------------------------------------

type RequirementKind = 'COLLECTION' | 'FIELD' | 'SELECT_OPTION';
type FieldConstraint = 'WRITABLE' | 'RELATION' | 'SELECTION';

export interface Requirement {
  key: string;
  kind: RequirementKind;
  parentKey?: string;
  label: string;
  descriptor:
    | { kind: 'collection'; collectionType: StandardCollection | 'custom' }
    | {
        kind: 'field';
        type: string;
        inputMode: string;
        refCollectionKey?: string;
        optionKeys?: string[];
        constraints?: FieldConstraint[];
      }
    | { kind: 'selectOption' };
  purpose?: string;
  synonyms: string[];
  required: boolean;
  createIfMissing: boolean;
}

export interface RequirementManifest {
  sourceType: 'APP';
  sourceId: string;
  version: 1;
  title: string;
  summary: string;
  requirements: Requirement[];
  /** Not read by the install service yet; see {@link AppManifest.workflows}. */
  workflows: Array<{ template: string; required: boolean }>;
}

/**
 * Public (Open API) field types → the install service's internal type and
 * input mode. Types missing here — COMPUTED, AGGREGATE, ADDRESS, GEOFENCE,
 * BREAK, POLICY, WIDGET — are system-managed and can't be declared: an app
 * that reads one should leave it out of `type` and resolve it by name.
 */
const FIELD_TYPES: Record<string, { type: string; inputMode: string; links?: StandardCollection }> = {
  TEXT: { type: 'text', inputMode: 'plain' },
  EMAIL: { type: 'text', inputMode: 'plain' },
  PHONE: { type: 'phone', inputMode: 'plain' },
  NUMBER: { type: 'number', inputMode: 'plain' },
  CURRENCY: { type: 'currency', inputMode: 'plain' },
  BOOLEAN: { type: 'boolean', inputMode: 'plain' },
  DATETIME: { type: 'datetime', inputMode: 'plain' },
  DATETIME_RANGE: { type: 'datetime_range', inputMode: 'plain' },
  FILE: { type: 'file', inputMode: 'plain' },
  RATING: { type: 'rating', inputMode: 'rating' },
  SINGLE_SELECT: { type: 'plain_selection', inputMode: 'single' },
  MULTI_SELECT: { type: 'plain_selection', inputMode: 'multi' },
  LINK_TO_USER: { type: 'user', inputMode: 'single', links: 'user' },
  LINK_TO_LOCATION: { type: 'location', inputMode: 'single', links: 'location' },
  LINK_TO_ROLE: { type: 'role', inputMode: 'single', links: 'role' },
  LINK_TO_JOB: { type: 'job', inputMode: 'single', links: 'job' },
  LINK_TO_PLACEMENT: { type: 'placement', inputMode: 'single', links: 'placement' },
  LINK_TO_SHIFT: { type: 'shift', inputMode: 'single', links: 'shift' },
  LINK_TO_SHIFT_GROUP: { type: 'shift_group', inputMode: 'single', links: 'shift_group' },
  LINK_TO_CONTACT: { type: 'contact', inputMode: 'single', links: 'contact' },
  LINK_TO_PROJECT: { type: 'project', inputMode: 'single', links: 'project' },
  LINK_TO_TASK: { type: 'task', inputMode: 'single', links: 'task' },
  LINK_TO_DOCUMENT: { type: 'document', inputMode: 'single', links: 'document' },
  CUSTOM_FIELD: { type: 'custom', inputMode: 'single' },
};

const STANDARD_LABELS: Record<StandardCollection, string> = {
  user: 'Users',
  shift: 'Shifts',
  location: 'Locations',
  role: 'Roles',
  job: 'Jobs',
  placement: 'Placements',
  contact: 'Contacts',
  project: 'Projects',
  document: 'Documents',
  task: 'Tasks',
  shift_group: 'Shift Groups',
  timeoff: 'Time Off',
  break: 'Breaks',
  pay_periods: 'Pay Periods',
};

/** `Expiring soon` → `expiring_soon`, for option keys. */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Converts an app manifest to the install service's `RequirementManifest`.
 * Throws with every problem at once, so a bad spec is fixed in one pass.
 *
 * A link field needs the collection it points at in the same manifest. When
 * the spec doesn't declare that collection itself, it is added under the key
 * `std.<collection>` (e.g. `std.user`), required only if the field is.
 */
export function buildRequirementManifest(manifest: AppManifest): RequirementManifest {
  const problems: string[] = [];
  const requirements: Requirement[] = [];
  const implicit = new Map<StandardCollection, Requirement>();

  if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.slug)) {
    problems.push(`slug "${manifest.slug}" should be lowercase letters, digits and dashes`);
  }

  // A standard collection the spec declares is the target for links to it.
  const declaredStandard = new Map<StandardCollection, string>();
  for (const [key, collection] of Object.entries(manifest.requires)) {
    if (collection.standard) declaredStandard.set(collection.standard, key);
  }

  const collectionKeyFor = (standard: StandardCollection, required: boolean): string => {
    const declared = declaredStandard.get(standard);
    if (declared) return declared;
    const key = `std.${standard}`;
    const existing = implicit.get(standard);
    if (existing) {
      existing.required ||= required;
    } else {
      implicit.set(standard, {
        key,
        kind: 'COLLECTION',
        label: STANDARD_LABELS[standard],
        descriptor: { kind: 'collection', collectionType: standard },
        purpose: `Linked to from this app's fields.`,
        synonyms: [],
        required,
        createIfMissing: false,
      });
    }
    return key;
  };

  for (const [collectionKey, collection] of Object.entries(manifest.requires)) {
    const collectionRequired = collection.required ?? true;
    requirements.push(collectionRequirement(collectionKey, collection, collectionRequired));

    for (const [fieldKey, field] of Object.entries(collection.fields)) {
      const key = `${collectionKey}.${fieldKey}`;
      const required = collectionRequired && Boolean(field.required);
      const where = `${collection.name} → ${field.name} (${key})`;

      // Pinned ids (`field.id`) are account-specific, so they never go into the manifest.
      if (typeof field.type !== 'string') {
        problems.push(`${where}: give it exactly one \`type\` to be installable`);
        continue;
      }
      const mapped = FIELD_TYPES[field.type];
      if (!mapped) {
        problems.push(`${where}: type ${field.type} can't be declared for install (it is system-managed)`);
        continue;
      }

      const isSelect = field.type === 'SINGLE_SELECT' || field.type === 'MULTI_SELECT';
      const isLink = mapped.type === 'custom' || Boolean(mapped.links);
      if (field.options && !isSelect) problems.push(`${where}: \`options\` only apply to select fields`);
      if (field.multiple && !isLink) problems.push(`${where}: \`multiple\` only applies to link fields`);

      let refCollectionKey: string | undefined;
      if (mapped.links) {
        refCollectionKey = collectionKeyFor(mapped.links, required);
      } else if (mapped.type === 'custom') {
        if (!field.links || !manifest.requires[field.links]) {
          problems.push(`${where}: a CUSTOM_FIELD link needs \`links\` set to the key of a collection in the spec`);
        } else {
          refCollectionKey = field.links;
        }
      }

      const optionKeys = (field.options ?? []).map((option) => `${key}.${slugify(option)}`);
      const constraints: FieldConstraint[] = [];
      if (field.access === 'write') constraints.push('WRITABLE');
      if (isSelect) constraints.push('SELECTION');
      if (isLink) constraints.push('RELATION');

      requirements.push({
        key,
        kind: 'FIELD',
        parentKey: collectionKey,
        label: field.name,
        descriptor: {
          kind: 'field',
          type: mapped.type,
          inputMode: isLink && field.multiple ? 'multi' : mapped.inputMode,
          ...(refCollectionKey ? { refCollectionKey } : {}),
          ...(optionKeys.length ? { optionKeys } : {}),
          ...(constraints.length ? { constraints } : {}),
        },
        ...(field.purpose ? { purpose: field.purpose } : {}),
        synonyms: field.synonyms ?? [],
        required,
        createIfMissing: Boolean(field.createIfMissing),
      });

      (field.options ?? []).forEach((option, index) => {
        requirements.push({
          key: optionKeys[index],
          kind: 'SELECT_OPTION',
          parentKey: key,
          label: option,
          descriptor: { kind: 'selectOption' },
          purpose: `An option of ${field.name}.`,
          synonyms: [],
          // An option the app relies on is as required as its field.
          required,
          createIfMissing: Boolean(field.createIfMissing),
        });
      });
    }
  }

  requirements.unshift(...implicit.values());

  const seen = new Set<string>();
  for (const requirement of requirements) {
    if (seen.has(requirement.key)) problems.push(`two requirements share the key "${requirement.key}"`);
    seen.add(requirement.key);
  }

  if (problems.length > 0) {
    throw new Error(`The app manifest has problems:\n  - ${problems.join('\n  - ')}`);
  }

  return {
    sourceType: 'APP',
    sourceId: manifest.slug,
    version: 1,
    title: manifest.title,
    summary: manifest.summary,
    requirements,
    workflows: (manifest.workflows ?? []).map((workflow) => ({
      template: workflow.template,
      required: Boolean(workflow.required),
    })),
  };
}

function collectionRequirement(key: string, collection: CollectionSpec, required: boolean): Requirement {
  return {
    key,
    kind: 'COLLECTION',
    label: collection.name,
    descriptor: { kind: 'collection', collectionType: collection.standard ?? 'custom' },
    ...(collection.purpose ? { purpose: collection.purpose } : {}),
    synonyms: collection.synonyms ?? [],
    required,
    // The install service doesn't create collections; an account without a
    // custom collection the app needs is set up by hand.
    createIfMissing: false,
  };
}

/** The manifest as stable, pretty-printed JSON — what `teambridge.manifest.json` holds. */
export function manifestJson(manifest: AppManifest): string {
  return `${JSON.stringify(buildRequirementManifest(manifest), null, 2)}\n`;
}

// Re-exported so `app/manifest.ts` needs a single import.
export type { FieldSpec, CollectionSpec, SchemaSpec, StandardCollection };
