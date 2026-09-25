const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Drafts, spam, and trash stay out of the stored thread. */
export function visibleGmailThreadMessage(labelIds?: string[]) {
  if (!labelIds) return true;
  return (
    !labelIds.includes("DRAFT") &&
    !labelIds.includes("TRASH") &&
    !labelIds.includes("SPAM")
  );
}

export function isMailboxAddress(
  email: string | null | undefined,
  mailbox: string,
) {
  const own = mailbox.trim().toLowerCase();
  return !!email && !!own && email.trim().toLowerCase() === own;
}

/** First address on To that is not the mailbox. That person is the contact. */
export function counterpartyEmail(
  toHeader: string | null | undefined,
  mailbox: string,
) {
  if (!toHeader) return null;
  const own = mailbox.trim().toLowerCase();
  const found = toHeader.match(EMAIL_RE) ?? [];
  for (const email of found) {
    const normalized = email.toLowerCase();
    if (normalized !== own) return normalized;
  }
  return null;
}
