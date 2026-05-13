'use client';

import NextLink from 'next/link';
import { useRouter as useNextRouter } from 'next/navigation';
import { useMemo, type ComponentProps } from 'react';
import { tbPath } from './url';

type AppRouter = ReturnType<typeof useNextRouter>;

/**
 * Wraps `next/navigation`'s `useRouter` so `push`, `replace`, and `prefetch`
 * automatically prepend the Teambridge app base path. Same shape as
 * `useRouter()` — drop-in replacement.
 *
 * @example
 *   const router = useTBRouter();
 *   router.push('/dashboards/123'); // becomes /apps/<slug>/dashboards/123
 */
export function useTBRouter(): AppRouter {
  const router = useNextRouter();
  return useMemo<AppRouter>(
    () => ({
      ...router,
      push: (href, options) => router.push(tbPath(href), options),
      replace: (href, options) => router.replace(tbPath(href), options),
      prefetch: (href, options) => router.prefetch(tbPath(href), options),
    }),
    [router],
  );
}

type TBLinkProps = ComponentProps<typeof NextLink>;

/**
 * Wraps `next/link` so string `href`s and `UrlObject.pathname` automatically
 * include the Teambridge app base path. Absolute URLs pass through unchanged.
 *
 * @example
 *   <TBLink href="/dashboards/123">View</TBLink>
 *   <TBLink href={{ pathname: '/foo', query: { q: '1' } }}>Foo</TBLink>
 */
export function TBLink({ href, ...rest }: TBLinkProps) {
  const prefixedHref =
    typeof href === 'string'
      ? tbPath(href)
      : href && typeof href === 'object'
        ? { ...href, pathname: href.pathname ? tbPath(href.pathname) : href.pathname }
        : href;
  return <NextLink href={prefixedHref} {...rest} />;
}
