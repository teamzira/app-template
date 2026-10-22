/**
 * What an account is missing, and how to fix it. Every page renders it after
 * `requireSetup` (AGENTS.md → "Per-account configuration" → "The gate"):
 *
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   if (!resolved.ready) return <SetupNotice issues={resolved.issues} />;  // no database only
 *   …
 *   <SetupNotice issues={resolved.issues} />  // above the content, for optional slots
 *
 * It renders nothing when nothing needs saying: "Not used" is an admin's own
 * choice, not a problem. Required slots only reach a page on a production
 * deployment without a database; everywhere else `requireSetup` sends the
 * user to Settings first. Without a database there is no Settings page, so
 * the notice says what to rename in Teambridge instead of linking there.
 *
 * The copy is for people using the app, who know Teambridge and nothing of
 * how the app is built: it talks about collections and fields, never about a
 * database, a deployment or configuration. The server log is where those go.
 *
 * A server component: it reads the environment to tell the two cases apart.
 */
import Link from 'next/link';
import { AlertTriangleIcon } from 'lucide-react';
import { SETUP_PATH, settingsEnabled } from '@/lib/teambridge/setup';
import type { SchemaIssue } from '@/lib/teambridge/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SetupNotice({ issues, className }: { issues: SchemaIssue[]; className?: string }) {
  const shown = issues.filter((issue) => issue.kind !== 'not-used');
  if (shown.length === 0) return null;

  const blocking = shown.some((issue) => issue.blocking);
  const withSettings = settingsEnabled();

  return (
    <Alert className={className}>
      <AlertTriangleIcon />
      <AlertTitle>{blocking ? 'This app needs a few things before it can run' : 'Some features are limited'}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {shown.map((issue) => (
            <li key={`${issue.kind}/${issue.collection}/${issue.field ?? ''}`}>
              {withSettings ? issue.message : describeWithoutSettings(issue)}
            </li>
          ))}
        </ul>
        {withSettings ? (
          <p className="mt-2">
            Choose the collections and fields this app uses in{' '}
            <Link href={SETUP_PATH} className="text-primary hover:underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          <p className="mt-2">
            The app looks these up by their names in Teambridge. An admin can fix this by renaming the collection
            or field in Teambridge so it matches exactly.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * The issue in terms of what the account needs, for a deployment where the
 * fix is in Teambridge rather than in Settings. Without a database the only
 * way a slot resolves is the guess by name (or an id pinned in the code), so
 * `not-set` means no single collection or field carries the name.
 */
function describeWithoutSettings(issue: SchemaIssue): string {
  if (issue.kind === 'not-set') {
    if (!issue.field) return `No collection named "${issue.collection}" was found.`;
    const type = issue.types ? `${issue.types.join(' or ')} ` : '';
    return `"${issue.collection}" has no ${type}field named "${issue.field}".`;
  }
  if (issue.kind === 'not-found') {
    return issue.field
      ? `"${issue.collection} → ${issue.field}" refers to a field this account doesn't have.`
      : `"${issue.collection}" refers to a collection this account doesn't have.`;
  }
  return issue.message;
}
