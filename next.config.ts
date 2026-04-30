import type { NextConfig } from "next";

const isProduction =
  process.env.VERCEL_ENV === "production" &&
  process.env.TB_DEV_MODE !== "true";

const nextConfig: NextConfig = {
  assetPrefix:
    isProduction && process.env.APP_SLUG
      ? `https://api.teambridge.com/apps/${process.env.APP_SLUG}/`
      : undefined,
};

export default nextConfig;
