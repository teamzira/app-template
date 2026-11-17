import type { NextConfig } from "next";

const isDevMode = process.env.TB_DEV_MODE === "true";

const tbServerBaseUrl =
  process.env.TB_SERVER_BASE_URL || "https://api.teambridge.com";

const tbAppBasePath =
  !isDevMode && process.env.APP_SLUG ? `/apps/${process.env.APP_SLUG}` : "";

const nextConfig: NextConfig = {
  // The iframe host serves this app at `/apps/{slug}/` (with trailing slash),
  // and the parent's URL sync depends on that form staying stable across
  // client-side navigations. Without this, `router.replace('/apps/foo/')`
  // would be normalized to `/apps/foo`, causing the iframe URL to drift and
  // breaking relative `<Link href="./...">` resolution against it.
  trailingSlash: true,
  // Tells Next.js that this app's routes live under `/apps/{slug}` so that
  // `<Link>`, `router.push`, and `usePathname` work natively without manual
  // prefix arithmetic, and same-origin Link clicks stay client-side instead
  // of falling back to full document loads. Requires the Teambridge proxy
  // to forward `/apps/{slug}/...` through to this server (no prefix
  // stripping) — otherwise Next will 404 on all requests.
  basePath: tbAppBasePath || undefined,
  assetPrefix:
    !isDevMode && process.env.APP_SLUG
      ? `${tbServerBaseUrl}/apps/${process.env.APP_SLUG}/`
      : undefined,
  env: {
    NEXT_PUBLIC_TB_APP_BASE_PATH: tbAppBasePath,
  },
  // Server Actions are posted from the iframe, whose origin is the Teambridge
  // proxy, to this server, whose host is something else. Next rejects an
  // action whose `Origin` header doesn't match the host with a 500 ("Invalid
  // Server Actions request"), so the proxy host is allowed here. The proxy
  // doesn't forward `Origin` today, which is why actions work at all; this
  // keeps them working the day it does.
  ...(isDevMode
    ? {}
    : { experimental: { serverActions: { allowedOrigins: [new URL(tbServerBaseUrl).host] } } }),
};

export default nextConfig;
