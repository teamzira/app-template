import { NextResponse } from 'next/server';
import { getTBClient, getTBContext, TBApiError, type Field } from '@/lib/teambridge';
import { matchFields } from '@/lib/teambridge/schema';
import { schema } from '@/app/schema';

/**
 * The fields of one collection, with a good-faith guess for each slot of a
 * spec collection (`matchFields`: the one field with the slot's name and
 * type). The setup form calls this when the admin changes a collection
 * picker: `?collection=<spec key>&collectionId=<id>`.
 *
 * Field metadata is account structure, not user data, so this uses the app's
 * own access. The trailing slash in the path is required (`trailingSlash:
 * true` answers the slash-less form with a redirect).
 */
export async function GET(request: Request) {
  const { accountId } = await getTBContext();
  const params = new URL(request.url).searchParams;
  const key = params.get('collection') ?? '';
  const collectionId = params.get('collectionId');
  const spec = Object.hasOwn(schema, key) ? schema[key as keyof typeof schema] : null;
  if (!spec || !collectionId) {
    return NextResponse.json({ error: 'collection and collectionId are required' }, { status: 400 });
  }

  try {
    const fields = await getTBClient({ accountId }).collections.getFields(collectionId);
    const matched: Record<string, Field | null> = matchFields(fields, spec);
    return NextResponse.json({
      fields: fields.map(({ id, name, type }) => ({ id, name, type })),
      suggested: Object.fromEntries(
        Object.entries(matched).map(([fieldKey, field]) => [fieldKey, field?.id ?? null])
      ),
    });
  } catch (e) {
    console.error('[setup/fields]', e);
    if (e instanceof TBApiError && e.isNotInstalled) {
      return NextResponse.json({ error: "This app isn't installed on this account." }, { status: 403 });
    }
    if (e instanceof TBApiError && e.status === 404) {
      return NextResponse.json({ error: 'That collection no longer exists. Reload this page.' }, { status: 404 });
    }
    return NextResponse.json({ error: "Couldn't load this collection's fields. Try again." }, { status: 502 });
  }
}
