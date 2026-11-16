/**
 * The notice for optional slots an account hasn't set, with a link to where
 * they are set. Every page renders it above its content after `requireSetup`
 * (AGENTS.md → "Per-account configuration" → "The gate"):
 *
 *   const resolved = await requireSetup(getTBClient({ accountId }), schema);
 *   …
 *   <SetupNotice resolved={resolved} />
 *
 * The link goes to the app's own Settings, or, when Teambridge holds the
 * account's bindings (`resolved.teambridgeSlug`), to the app's setup in
 * Teambridge's App Library, opened on the host's page.
 *
 * It renders nothing when nothing needs saying: "Not used" is an admin's own
 * choice, not a problem, and required slots never reach a page (the gate
 * sends the user to setup first). On a deployment without Settings (no
 * database in production) and no bindings in Teambridge it always renders
 * nothing: the people using the app can't change anything there, so the
 * features that need an optional slot just stay off, and the app says
 * nothing about why.
 *
 * A server component: it reads the environment to tell the cases apart.
 */
import Link from 'next/link';
import { AlertTriangleIcon } from 'lucide-react';
import { appLibrarySetupPath } from '@/lib/teambridge/host';
import { TBHostLink } from '@/lib/teambridge/router';
import { SETUP_PATH, settingsEnabled } from '@/lib/teambridge/setup';
import type { ResolvedSchema, SchemaSpec } from '@/lib/teambridge/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SetupNotice({
  resolved,
  className,
}: {
  resolved: Pick<ResolvedSchema<SchemaSpec>, 'issues' | 'teambridgeSlug'>;
  className?: string;
}) {
  const { issues, teambridgeSlug } = resolved;
  if (!teambridgeSlug && !settingsEnabled()) return null;
  const shown = issues.filter((issue) => issue.kind !== 'not-used');
  if (shown.length === 0) return null;

  return (
    <Alert className={className}>
      <AlertTriangleIcon />
      <AlertTitle>Some features are limited</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {shown.map((issue) => (
            <li key={`${issue.kind}/${issue.collection}/${issue.field ?? ''}/${issue.option ?? ''}`}>{issue.message}</li>
          ))}
        </ul>
        <p className="mt-2">
          {teambridgeSlug ? (
            <>
              An admin can finish this app&apos;s setup in{' '}
              <TBHostLink path={appLibrarySetupPath(teambridgeSlug)} className="text-primary hover:underline">
                Teambridge&apos;s App Library
              </TBHostLink>
              .
            </>
          ) : (
            <>
              Choose the collections and fields this app uses in{' '}
              <Link href={SETUP_PATH} className="text-primary hover:underline">
                Settings
              </Link>
              .
            </>
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}
