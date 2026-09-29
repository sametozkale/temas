import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfmake reads its font files from disk; keep it external so the
  // function bundle includes the package instead of an inlined require
  // that Vercel cannot resolve.
  serverExternalPackages: ["pdfmake", "pdfkit"],
  // Keep the dev badge away from the sidebar user menu.
  devIndicators: { position: "bottom-right" },
  experimental: {
    // Next 15 defaults dynamic RSC cache to 0s, so every sidebar click
    // re-runs the app layout (auth + chats + unread). 30s matches the
    // App Router 14 client cache and keeps chrome instant between pages.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
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
