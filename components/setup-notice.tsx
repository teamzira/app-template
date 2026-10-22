/**
 * The notice for optional slots an account hasn't set, with a link to
 * Settings to set them. Every page renders it above its content after
 * `requireSetup` (AGENTS.md → "Per-account configuration" → "The gate"):
 *
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   …
 *   <SetupNotice issues={resolved.issues} />
 *
 * It renders nothing when nothing needs saying: "Not used" is an admin's own
 * choice, not a problem, and required slots never reach a page (the gate
 * sends the user to Settings first). On a deployment without Settings (no
 * database in production) it always renders nothing: the people using the
 * app can't change anything there, so the features that need an optional
 * slot just stay off, and the app says nothing about why.
 *
 * A server component: it reads the environment to tell the two cases apart.
 */
import Link from 'next/link';
import { AlertTriangleIcon } from 'lucide-react';
import { SETUP_PATH, settingsEnabled } from '@/lib/teambridge/setup';
import type { SchemaIssue } from '@/lib/teambridge/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SetupNotice({ issues, className }: { issues: SchemaIssue[]; className?: string }) {
  if (!settingsEnabled()) return null;
  const shown = issues.filter((issue) => issue.kind !== 'not-used');
  if (shown.length === 0) return null;

  return (
    <Alert className={className}>
      <AlertTriangleIcon />
      <AlertTitle>Some features are limited</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {shown.map((issue) => (
            <li key={`${issue.kind}/${issue.collection}/${issue.field ?? ''}`}>{issue.message}</li>
          ))}
        </ul>
        <p className="mt-2">
          Choose the collections and fields this app uses in{' '}
          <Link href={SETUP_PATH} className="text-primary hover:underline">
            Settings
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}
