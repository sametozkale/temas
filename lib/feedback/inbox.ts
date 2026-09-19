import { env, integrations } from "@/lib/env";

/** Local Mailpit accepts any address. Resend requires a real inbox. */
export function resolveFeedbackInbox(input: {
  configured?: string;
  nodeEnv: string;
  resendConfigured: boolean;
}): string | null {
  const to = input.configured?.trim();
  if (to) return to;
  if (input.nodeEnv !== "production" && !input.resendConfigured) {
    return "feedback@localhost";
  }
  return null;
}

export function feedbackInbox(): string | null {
  return resolveFeedbackInbox({
    configured: env().FEEDBACK_TO,
    nodeEnv: env().NODE_ENV,
    resendConfigured: integrations.resend(),
  });
}
