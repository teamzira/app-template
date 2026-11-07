/**
 * Stands in for `@/lib/teambridge` in the preview: the samples' own loaders run unchanged, against
 * a client that serves the sample rows in ../fixtures.ts and honours the filters they send.
 */
import type { DataRecord, Field } from '@/lib/teambridge/client/types';
import type { ResolvedSchema, SchemaSpec } from '@/lib/teambridge/schema';
import { readIds } from '@/lib/teambridge/schema';
import { buildFixtures, PREVIEW_USER } from '../fixtures';

export type { Field } from '@/lib/teambridge/client/types';

const fixtures = buildFixtures(new Date());

export class TBApiError extends Error {
  isNotInstalled = false;
}

function matches(record: DataRecord, filters: Record<string, unknown> | undefined): boolean {
  return Object.entries(filters ?? {}).every(([key, expected]) => {
    const split = key.lastIndexOf('_');
    const fieldId = key.slice(0, split);
    const op = key.slice(split + 1);
    const value = record[fieldId];
    if (op === 'is') return readIds(value).includes(String(expected)) || value === expected;
    const actual = typeof value === 'string' ? Date.parse(value) : Number(value);
    const bound = typeof expected === 'string' ? Date.parse(expected) : Number(expected);
    if (Number.isNaN(actual)) return false;
    if (op === 'gte') return actual >= bound;
    if (op === 'gt') return actual > bound;
    if (op === 'lte') return actual <= bound;
    if (op === 'lt') return actual < bound;
    return true;
  });
}

type ListOptions = { page?: number; pageSize?: number; maxPages?: number; filters?: Record<string, unknown> };

const client = {
  accountId: 'preview',
  collections: {
    records: {
      list: async (collectionId: string, options?: ListOptions) => {
        const all = (fixtures[collectionId] ?? []).filter((r) => matches(r, options?.filters));
        const size = options?.pageSize ?? 20;
        const page = options?.page ?? 0;
        return { data: all.slice(page * size, page * size + size), page, size, totalCount: all.length };
      },
      listAll: async (collectionId: string, options?: ListOptions) => {
        const data = (fixtures[collectionId] ?? []).filter((r) => matches(r, options?.filters));
        return { data, totalCount: data.length, truncated: false };
      },
    },
  },
};

export const getAppCredentials = () => ({ clientId: 'preview', clientSecret: 'preview' });
export const getTBContext = async () => ({ accountId: 'preview', userId: PREVIEW_USER.id, user: PREVIEW_USER });
export const getTBClient = (_ctx?: unknown) => client;

export async function requireSetup<S extends SchemaSpec>(_client: unknown, spec: S): Promise<ResolvedSchema<S>> {
  const collections = Object.fromEntries(
    Object.entries(spec).map(([key, collection]) => [
      key,
      {
        id: collection.id ?? null,
        name: collection.name,
        fields: Object.fromEntries(
          Object.entries(collection.fields).map(([fieldKey, field]) => [
            fieldKey,
            field.id
              ? ({ id: field.id, name: field.name, type: String(field.type ?? 'TEXT'), required: Boolean(field.required) } satisfies Field)
              : null,
          ])
        ),
      },
    ])
  );
  // Built from the spec at runtime, so its keys are only known as strings here.
  return { ready: true, collections, issues: [] } as unknown as ResolvedSchema<S>;
}

export async function lookupNames(
  _client: unknown,
  collectionId: string,
  ids: Iterable<string | null | undefined>,
  options: { fields: Field[] }
): Promise<Map<string, string>> {
  const wanted = new Set([...ids].filter((id): id is string => Boolean(id)));
  const names = new Map<string, string>();
  for (const record of fixtures[collectionId] ?? []) {
    if (!wanted.has(record.id)) continue;
    const name = options.fields.map((f) => record[f.id]).filter(Boolean).join(' ');
    if (name) names.set(record.id, name);
  }
  return names;
}
