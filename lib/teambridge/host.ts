/**
 * Pages of the Teambridge web app (the host around the iframe) that an app
 * links to. Paths only: the host's origin is not the proxy's, so links to
 * these go through `TBHostLink` (`./router`), which finds the origin in the
 * browser.
 *
 * Importable from Client Components (no server-only imports).
 */

/** The App Library page in Teambridge, where an admin installs apps and reviews an installed app's setup. */
export const TB_APP_LIBRARY_SETUP_PATH = '/apps/library';

/** The App Library opened on this app's setup review: `?setup=<slug>`. */
export function appLibrarySetupPath(slug: string): string {
  return `${TB_APP_LIBRARY_SETUP_PATH}?setup=${encodeURIComponent(slug)}`;
}
