import { redirect, type RedirectType } from 'next/navigation';
import { tbPath } from './url';

/**
 * Wraps `next/navigation`'s `redirect` so the destination path includes the
 * Teambridge app base path. Use from server actions and server components
 * when redirecting to a same-origin path. Absolute URLs pass through.
 *
 * Like `redirect`, this throws a special error that Next.js intercepts to
 * issue a navigation response — it never returns to the caller.
 */
export function tbRedirect(path: string, type?: RedirectType): never {
  redirect(tbPath(path), type);
}
