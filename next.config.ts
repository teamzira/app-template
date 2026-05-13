import type { NextConfig } from "next";

const isDevMode =
  process.env.TB_DEV_MODE === "true" ||
  (process.env.V0_MODE === "true" &&
    process.env.VERCEL_ENV !== "production");

const tbServerBaseUrl =
  process.env.TB_SERVER_BASE_URL || "https://api.teambridge.com";

const tbAppBasePath =
  !isDevMode && process.env.APP_SLUG ? `/apps/${process.env.APP_SLUG}` : "";

const nextConfig: NextConfig = {
  assetPrefix:
    !isDevMode && process.env.APP_SLUG
      ? `${tbServerBaseUrl}/apps/${process.env.APP_SLUG}/`
      : undefined,
  env: {
    NEXT_PUBLIC_TB_APP_BASE_PATH: tbAppBasePath,
  },
};

export default nextConfig;
