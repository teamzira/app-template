import type { NextConfig } from "next";

const isDevMode =
  process.env.TB_DEV_MODE === "true" ||
  process.env.VERCEL_ENV === "development" ||
  process.env.VERCEL_ENV === "preview";

const nextConfig: NextConfig = {
  assetPrefix:
    isDevMode || !process.env.APP_SLUG
      ? undefined
      : `https://api.teambridge.com/apps/${process.env.APP_SLUG}/`,
};

export default nextConfig;
