/**
 * GoTrue's built-in mailer refuses a second magic link for about a minute
 * and reports the remaining wait as `over_email_send_rate_limit`. A short
 * wait means a link was just sent, so the sign-in form should show the
 * check-email state instead of a lockout.
 */
export function recentAuthEmailCooldown(error: {
  status?: number;
  code?: string;
  message?: string;
}): boolean {
  if (error.status !== 429 || error.code !== "over_email_send_rate_limit") {
    return false;
  }
  const seconds = Number(/after (\d+) seconds/.exec(error.message ?? "")?.[1]);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 90;
}
