import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev badge away from the sidebar user menu.
  devIndicators: { position: "bottom-right" },
  experimental: {
    optimizePackageImports: [
      "date-fns",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "lucide-react",
      "radix-ui",
    ],
  },
};

export default withNextIntl(nextConfig);
