import { configuredAppUrl } from "@/lib/app-url";
import { env, integrations } from "@/lib/env";
import { secureToken } from "@/lib/slug";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const SCOPES = GOOGLE_OAUTH_SCOPES;

/**
 * Google omits `scope` on the token response when it matches the request
 * (RFC 6749). Missing must not be stored as "no calendar access".
 * A present value is the granted set, including a partial consent.
 */
export function googleGrantedScope(scope: string | undefined) {
  const granted = scope?.trim();
  return granted ? granted : GOOGLE_OAUTH_SCOPES;
}

export function gmailRedirectUri() {
  return new URL(
    "/api/integrations/gmail/callback",
    configuredAppUrl(),
  ).toString();
}

export function isGmailConfigured() {
  return integrations.gmail();
}

export function createOauthState() {
  return secureToken(16);
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID ?? "",
    redirect_uri: gmailRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: env().GOOGLE_CLIENT_ID ?? "",
    client_secret: env().GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: gmailRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`google_token_${res.status}`);
  }
  return res.json() as Promise<GoogleTokens>;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env().GOOGLE_CLIENT_ID ?? "",
    client_secret: env().GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`google_refresh_${res.status}`);
  }
  return res.json() as Promise<GoogleTokens>;
}
