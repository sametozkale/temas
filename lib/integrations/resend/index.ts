import "server-only";

import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { env, integrations } from "@/lib/env";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

export type EmailTransport = {
  readonly name: "resend" | "mailpit";
  send(message: EmailMessage & { html: string; text: string }): Promise<void>;
};

function resendTransport(apiKey: string): EmailTransport {
  const client = new Resend(apiKey);
  return {
    name: "resend",
    async send({ to, subject, html, text, replyTo }) {
      const { error } = await client.emails.send({
        from: env().EMAIL_FROM,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      if (error) throw new Error(`Resend: ${error.message}`);
    },
  };
}

/** Dev fallback: deliver to the local Supabase Mailpit (UI on :54324). */
function mailpitTransport(): EmailTransport {
  const transporter = nodemailer.createTransport({
    host: env().SMTP_HOST,
    port: env().SMTP_PORT,
    secure: false,
    ignoreTLS: true,
  });
  return {
    name: "mailpit",
    async send({ to, subject, html, text, replyTo }) {
      await transporter.sendMail({
        from: env().EMAIL_FROM,
        to,
        subject,
        html,
        text,
        replyTo,
      });
    },
  };
}

let transport: EmailTransport | undefined;
let transportKey: string | undefined;

function fromIsUnverifiedLocal(): boolean {
  return /@[^>]*\.local>?/i.test(env().EMAIL_FROM);
}

export function getEmailTransport(): EmailTransport {
  const key = env().RESEND_API_KEY;
  const from = env().EMAIL_FROM;
  const useResend = Boolean(
    integrations.resend() && key && !fromIsUnverifiedLocal(),
  );
  const cacheKey = `${useResend ? "resend" : "mailpit"}:${key ?? ""}:${from}`;
  if (transport && transportKey === cacheKey) return transport;
  // A .local From address cannot be verified on Resend; keep Mailpit in that case.
  transportKey = cacheKey;
  transport = useResend && key ? resendTransport(key) : mailpitTransport();
  return transport;
}

/** Render a react-email template and send it through the active transport. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const [html, text] = await Promise.all([
    render(message.react),
    render(message.react, { plainText: true }),
  ]);
  await getEmailTransport().send({ ...message, html, text });
}
