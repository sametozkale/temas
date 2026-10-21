import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";

import { DeferredToaster } from "@/components/deferred-toaster";
import { ClientMessages } from "@/components/intl/client-messages";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  // Italic is unused in the UI. Preloading it added two large woff2 files
  // to every document's critical path.
  style: ["normal"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: "Temas", template: "%s · Temas" },
    description: t("meta_description"),
    applicationName: "Temas",
    appleWebApp: { capable: true, title: "Temas", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#191816" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ClientMessages scope="errors">
            <TooltipProvider>
              {children}
              <DeferredToaster />
            </TooltipProvider>
          </ClientMessages>
        </ThemeProvider>
      </body>
    </html>
  );
}
