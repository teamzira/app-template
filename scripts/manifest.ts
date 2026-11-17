/**
 * Writes `teambridge.manifest.json` from `teambridge.manifest.ts`.
 *
 *   yarn manifest          regenerate the file
 *   yarn manifest:check    exit 1 if the file is out of date (runs before `yarn build`)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifest from '../teambridge.manifest';
import { buildRequirementManifest, serializeManifest, type RequirementManifest } from '../lib/teambridge/manifest';

const OUTPUT = resolve(__dirname, '..', 'teambridge.manifest.json');

let built: RequirementManifest;
try {
  built = buildRequirementManifest(manifest);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
const json = serializeManifest(built);

if (process.argv.includes('--check')) {
  let current: string | null = null;
  try {
    current = readFileSync(OUTPUT, 'utf8');
  } catch {
    // No file yet — that's stale too.
  }
  if (current !== json) {
    console.error(
      'teambridge.manifest.json is out of date with teambridge.manifest.ts. Run `yarn manifest` and commit the result.'
    );
    process.exit(1);
  }
  console.log('teambridge.manifest.json is up to date.');
} else {
  writeFileSync(OUTPUT, json);
  console.log(`Wrote teambridge.manifest.json (${built.requirements.length} requirements).`);
}
