/**
 * Writes `teambridge.manifest.json` from `app/manifest.ts`.
 *
 *   yarn manifest          regenerate the file
 *   yarn manifest:check    exit 1 if the file is out of date (runs before `yarn build`)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifest from '../app/manifest';
import { manifestJson } from '../lib/teambridge/manifest';

const OUTPUT = resolve(__dirname, '..', 'teambridge.manifest.json');
const check = process.argv.includes('--check');

let json: string;
try {
  json = manifestJson(manifest);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

let current: string | null = null;
try {
  current = readFileSync(OUTPUT, 'utf8');
} catch {
  // No file yet.
}

if (check) {
  if (current !== json) {
    console.error(
      'teambridge.manifest.json is out of date with app/manifest.ts. Run `yarn manifest` and commit the result.'
    );
    process.exit(1);
  }
  console.log('teambridge.manifest.json is up to date.');
} else {
  writeFileSync(OUTPUT, json);
  const { requirements } = JSON.parse(json) as { requirements: unknown[] };
  console.log(`Wrote teambridge.manifest.json (${requirements.length} requirements).`);
}
