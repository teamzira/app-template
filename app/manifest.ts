/**
 * EXAMPLE CODE — replace the slug, title and summary with your app's.
 *
 * The app's install manifest: what Teambridge checks an account for before
 * installing the app. After changing it (or `app/schema.ts`), run
 * `yarn manifest` and commit `teambridge.manifest.json`. See AGENTS.md →
 * "Install manifest".
 */
import { defineAppManifest } from '@/lib/teambridge/manifest';
import { schema } from './schema';

export default defineAppManifest({
  slug: 'shifts-dashboard',
  title: 'Shifts dashboard',
  summary: 'Lists shifts with their assignees, splits published from draft, and creates new shifts.',
  requires: schema,
});
