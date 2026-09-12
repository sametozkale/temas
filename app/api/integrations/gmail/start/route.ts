import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth";
import { env, integrations } from "@/lib/env";
import {
  createOauthState,
  googleAuthUrl,
} from "@/lib/integrations/gmail/oauth";
import { requireAbility } from "@/lib/permissions";

export const GMAIL_OAUTH_COOKIE = "havn_gmail_oauth";

export async function GET() {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=gmail_denied", env().APP_URL),
    );
  }

  if (!integrations.gmail()) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=gmail_oauth", env().APP_URL),
    );
  }

  const state = createOauthState();
  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set(
    GMAIL_OAUTH_COOKIE,
    JSON.stringify({ state, workspaceId: ctx.workspace.id }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env().NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    },
  );
  return response;
}
