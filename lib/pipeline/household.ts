export type HouseholdMember = {
  name: string;
  /** Present when the form or the lead contact recorded an address. */
  email?: string;
  /** Occupant counted in `occupants` but not named on the form. */
  unnamed?: boolean;
};

export type Household = {
  primary: string;
  members: HouseholdMember[];
  size: number;
  sharedLastName: string | null;
};

const HOUSEHOLD_ANSWER_KEYS = new Set(["household", "occupants"]);

export function isHouseholdAnswerKey(key: string) {
  return HOUSEHOLD_ANSWER_KEYS.has(key);
}

function lastWord(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? (parts[parts.length - 1] ?? null) : null;
}

function emailOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : undefined;
}

function namedPerson(name: string, email?: string): HouseholdMember {
  return email ? { name, email } : { name };
}

function parseNamedOthers(answers: Record<string, unknown>): HouseholdMember[] {
  const raw = answers.household;
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n|,/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      return name ? [{ name }] : [];
    }
    if (item && typeof item === "object" && "name" in item) {
      const name = String((item as { name: unknown }).name ?? "").trim();
      if (!name) return [];
      return [namedPerson(name, emailOf((item as { email?: unknown }).email))];
    }
    return [];
  });
}

function occupantsOf(answers: Record<string, unknown>): number | null {
  const raw = answers.occupants;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return null;
}

/** One application is one household: the lead contact plus anyone else who will live there. */
export function householdOf(
  primaryName: string,
  answers: Record<string, unknown> | null | undefined,
  primaryEmail?: string | null,
): Household {
  const primary = primaryName.trim() || "Applicant";
  const src = answers ?? {};
  const parsed = parseNamedOthers(src);
  const sameName = (name: string) =>
    name.localeCompare(primary, undefined, { sensitivity: "accent" }) === 0;
  const leadEmail =
    emailOf(primaryEmail) ?? parsed.find((person) => sameName(person.name))?.email;
  const others = parsed.filter((person) => !sameName(person.name));
  const named = [namedPerson(primary, leadEmail), ...others];
  const occupants = occupantsOf(src);
  const size = Math.max(named.length, occupants ?? named.length, 1);
  const unnamedCount = Math.min(Math.max(0, size - named.length), 4);
  const members: HouseholdMember[] = [
    ...named,
    ...Array.from({ length: unnamedCount }, () => ({
      name: "",
      unnamed: true,
    })),
  ];
  const namedMembers = members.filter((member) => !member.unnamed);
  const lasts = namedMembers.map((member) => lastWord(member.name));
  const sharedLastName =
    namedMembers.length >= 2 && lasts.every((last) => last && last === lasts[0])
      ? lasts[0]!
      : null;
  return { primary, members, size, sharedLastName };
}

export function householdMemberLine(household: Household): string {
  const names = household.members
    .filter((member) => !member.unnamed)
    .map((member) => member.name.split(/\s+/)[0] ?? member.name);
  const extra = household.members.filter((member) => member.unnamed).length;
  if (extra > 0) names.push(`+${extra}`);
  return names.join(" · ");
}

/** Other people in the household, without the lead. First names only. */
export function householdCompanions(household: Household): {
  names: string[];
  unnamed: number;
} {
  const names = household.members
    .filter(
      (member) =>
        !member.unnamed &&
        member.name.localeCompare(household.primary, undefined, {
          sensitivity: "accent",
        }) !== 0,
    )
    .map((member) => member.name.split(/\s+/)[0] ?? member.name);
  const unnamed = household.members.filter((member) => member.unnamed).length;
  return { names, unnamed };
}

/**
 * One line for a pipeline card: the lead's work, then the other people.
 * Drops the lead's name when the employment text already lists the household.
 */
export function householdCardLine(
  household: Household,
  employment: string | null | undefined,
): string | null {
  const job = employment?.trim() ?? "";
  const { names } = householdCompanions(household);
  const leadFirst = household.primary.split(/\s+/)[0] ?? household.primary;
  const known = new Set(
    [leadFirst, ...names].map((name) => name.toLowerCase()),
  );
  const parts = job
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = parts.map((part) => {
    const bits = part.split(/\s+—\s+/);
    if (bits.length !== 2) return null;
    const who = bits[0]?.trim() ?? "";
    const role = bits[1]?.trim() ?? "";
    if (!who || !role || !known.has(who.toLowerCase())) return null;
    return { who, role };
  });
  if (job && parsed.length === parts.length && parsed.every((part) => part)) {
    const roles = parsed
      .map((part) =>
        part!.who.toLowerCase() === leadFirst.toLowerCase()
          ? part!.role
          : `${part!.who} — ${part!.role}`,
      )
      .join(" · ");
    const missing = names.filter(
      (name) => !roles.toLowerCase().includes(name.toLowerCase()),
    );
    return missing.length ? `${roles} · ${missing.join(", ")}` : roles;
  }
  const people = names.join(", ");
  const mentionsPeople = names.some((name) =>
    job.toLowerCase().includes(name.toLowerCase()),
  );
  if (job && people && !mentionsPeople) return `${job} · ${people}`;
  if (job) return job;
  if (people) return people;
  return null;
}

export function householdLabel(
  household: Household,
  copy: {
    family: (name: string) => string;
    plus: (name: string, count: number) => string;
  },
): string {
  const namedCount = household.members.filter(
    (member) => !member.unnamed,
  ).length;
  if (household.sharedLastName) return copy.family(household.sharedLastName);
  if (household.size > 1 && namedCount === 1) {
    return copy.plus(household.primary, household.size - 1);
  }
  return household.primary;
}
