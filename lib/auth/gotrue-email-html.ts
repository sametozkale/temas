/**
 * GoTrue Auth HTML. Same chrome as emails/_layout.tsx (docs/01).
 * Links go through the app callback with token_hash so they never inherit
 * GoTrue’s /verify?redirect_to= localhost fallback.
 */
export const GOTRUE_EMAIL_KINDS = [
  "magic_link",
  "confirmation",
  "invite",
  "recovery",
  "email_change",
] as const;

export type GotrueEmailKind = (typeof GOTRUE_EMAIL_KINDS)[number];

export const GOTRUE_OTP_TYPE = {
  magic_link: "magiclink",
  confirmation: "signup",
  invite: "invite",
  recovery: "recovery",
  email_change: "email_change",
} as const;

export const GOTRUE_EMAIL_COPY: Record<
  GotrueEmailKind,
  {
    title: string;
    preview: string;
    heading: string;
    lede: string;
    cta: string;
  }
> = {
  magic_link: {
    title: "Sign in to Temas",
    preview: "Your one-time Temas sign-in link. It expires in 1 hour.",
    heading: "Sign in to Temas",
    lede: "We sent this one-time link to {{ .Email }}. It is valid for 1 hour.",
    cta: "Sign in",
  },
  confirmation: {
    title: "Confirm your email",
    preview: "Confirm this email address to finish signing in to Temas.",
    heading: "Confirm your email",
    lede: "Confirm this address to finish signing in. The link expires in 1 hour.",
    cta: "Confirm email",
  },
  invite: {
    title: "You're invited to Temas",
    preview: "Accept this invitation to join a Temas workspace.",
    heading: "You're invited to Temas",
    lede: "This address was invited to a Temas workspace. Accept to create your account. The link expires in 1 hour.",
    cta: "Accept invitation",
  },
  recovery: {
    title: "Reset your Temas password",
    preview: "Use this link to choose a new password. It expires in 1 hour.",
    heading: "Reset your password",
    lede: "Use the button below to choose a new password. This link expires in 1 hour.",
    cta: "Reset password",
  },
  email_change: {
    title: "Confirm your new email",
    preview:
      "Confirm this address to finish changing the email on your Temas account.",
    heading: "Confirm your new email",
    lede: "Confirm this address to finish changing the email on your Temas account. The link expires in 1 hour.",
    cta: "Confirm email",
  },
};

export function gotrueCallbackHref(type: string) {
  return `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=${type}`;
}

export function gotrueEmailHtml(kind: GotrueEmailKind) {
  const copy = GOTRUE_EMAIL_COPY[kind];
  const href = gotrueCallbackHref(GOTRUE_OTP_TYPE[kind]);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${copy.title}</title>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Newsreader:wght@500&display=swap"
    />
  </head>
  <body
    style="
      margin: 0;
      padding: 32px 0;
      background-color: #fafaf7;
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        sans-serif;
      color: #1c1b19;
      -webkit-font-smoothing: antialiased;
    "
  >
    <span
      style="
        display: none !important;
        visibility: hidden;
        opacity: 0;
        height: 0;
        width: 0;
        overflow: hidden;
        mso-hide: all;
      "
      >${copy.preview}</span
    >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
    >
      <tr>
        <td align="center" style="padding: 0 16px">
          <table
            role="presentation"
            width="520"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width: 100%;
              max-width: 520px;
              background-color: #ffffff;
              border: 1px solid #e9e6e0;
              border-radius: 10px;
            "
          >
            <tr>
              <td style="padding: 32px">
                <p
                  style="
                    font-family: Newsreader, Georgia, 'Times New Roman', serif;
                    font-size: 20px;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    line-height: 1.15;
                    margin: 0 0 24px;
                    color: #1c1b19;
                  "
                >
                  Temas
                </p>
                <h1
                  style="
                    font-family: Newsreader, Georgia, 'Times New Roman', serif;
                    font-size: 24px;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    line-height: 1.15;
                    margin: 0 0 12px;
                    color: #1c1b19;
                  "
                >
                  ${copy.heading}
                </h1>
                <p
                  style="
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0 0 24px;
                    color: #6e6c66;
                  "
                >
                  ${copy.lede}
                </p>
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                >
                  <tr>
                    <td
                      bgcolor="#22211E"
                      style="
                        background-color: #22211e;
                        border-radius: 9999px;
                      "
                    >
                      <a
                        href="${href}"
                        style="
                          display: inline-block;
                          padding: 10px 16px;
                          font-size: 14px;
                          font-weight: 500;
                          line-height: 20px;
                          color: #fafaf7;
                          text-decoration: none;
                        "
                        >${copy.cta}</a
                      >
                    </td>
                  </tr>
                </table>
                <hr
                  style="
                    border: none;
                    border-top: 1px solid #e9e6e0;
                    margin: 24px 0;
                  "
                />
                <p
                  style="
                    font-size: 12px;
                    line-height: 1.5;
                    color: #6e6c66;
                    margin: 0;
                  "
                >
                  This email was sent via Temas. If you weren&apos;t expecting
                  it, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
