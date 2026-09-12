export type MatchContact = {
  id: string;
  email: string | null;
  phone: string | null;
};

export type MatchProperty = {
  id: string;
  title: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function parseFromHeader(raw: string): {
  email: string | null;
  name: string | null;
} {
  const emailMatch = raw.match(/<([^>]+)>/) ?? raw.match(EMAIL_RE);
  const email = emailMatch
    ? (emailMatch[1] ?? emailMatch[0]).trim().toLowerCase()
    : null;
  const name =
    raw
      .replace(/<[^>]+>/, "")
      .replace(/"/g, "")
      .trim() || null;
  return {
    email: email && EMAIL_RE.test(email) ? email : null,
    name: name && name !== email ? name : null,
  };
}

export function normalizeSubject(subject: string | null | undefined): string {
  return (subject ?? "")
    .replace(/^(re|fwd|fw)\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchContactId(
  contacts: MatchContact[],
  email: string | null,
  phone: string | null,
): string | null {
  if (email) {
    const byEmail = contacts.find(
      (c) => c.email && c.email.toLowerCase() === email.toLowerCase(),
    );
    if (byEmail) return byEmail.id;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 7) {
      const byPhone = contacts.find((c) => {
        if (!c.phone) return false;
        return c.phone.replace(/\D/g, "").endsWith(digits.slice(-10));
      });
      if (byPhone) return byPhone.id;
    }
  }
  return null;
}

export function matchPropertyId(
  properties: MatchProperty[],
  linkedPropertyIds: string[],
  haystack: string,
): string | null {
  if (linkedPropertyIds.length === 1) return linkedPropertyIds[0]!;
  const text = haystack.toLowerCase();
  const pool =
    linkedPropertyIds.length > 1
      ? properties.filter((p) => linkedPropertyIds.includes(p.id))
      : properties;
  const hits = pool.filter((p) => {
    const title = p.title.trim().toLowerCase();
    return title.length >= 4 && text.includes(title);
  });
  if (hits.length === 1) return hits[0]!.id;
  if (linkedPropertyIds.length > 1 && hits.length === 0) {
    return linkedPropertyIds[0]!;
  }
  return null;
}
