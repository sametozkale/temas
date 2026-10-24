import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import {
  APP_OMIT_NAMESPACES,
  AUTH_CLIENT_PATHS,
  MARKETING_CLIENT_PATHS,
  ONBOARDING_CLIENT_PATHS,
  PUBLIC_CLIENT_PATHS,
  omitMessages,
  pickMessages,
} from "@/lib/i18n/client-messages";

const SCOPES = {
  errors: ["errors"],
  marketing: MARKETING_CLIENT_PATHS,
  auth: AUTH_CLIENT_PATHS,
  onboarding: ONBOARDING_CLIENT_PATHS,
  public: PUBLIC_CLIENT_PATHS,
} as const;

/**
 * Sends only the messages client components on this route actually read.
 * The full catalog stays on the server for `getTranslations`.
 */
export async function ClientMessages({
  scope,
  children,
}: {
  scope: keyof typeof SCOPES | "app" | "all";
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const clientMessages =
    scope === "all"
      ? messages
      : scope === "app"
        ? omitMessages(messages, APP_OMIT_NAMESPACES)
        : pickMessages(messages, SCOPES[scope]);

  return (
    <NextIntlClientProvider messages={clientMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
