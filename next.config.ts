import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev badge away from the sidebar user menu.
  devIndicators: { position: "bottom-right" },
};

export default withNextIntl(nextConfig);
