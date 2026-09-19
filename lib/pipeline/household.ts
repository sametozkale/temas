export type HouseholdMember = {
  name: string;
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

function parseNamedOthers(answers: Record<string, unknown>): string[] {
  const raw = answers.household;
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n|,/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (item && typeof item === "object" && "name" in item) {
      const name = String((item as { name: unknown }).name ?? "").trim();
      return name ? [name] : [];
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
): Household {
  const primary = primaryName.trim() || "Applicant";
  const src = answers ?? {};
  const others = parseNamedOthers(src).filter(
    (name) =>
      name.localeCompare(primary, undefined, { sensitivity: "accent" }) !== 0,
  );
  const named = [primary, ...others];
  const occupants = occupantsOf(src);
  const size = Math.max(named.length, occupants ?? named.length, 1);
  const unnamedCount = Math.min(Math.max(0, size - named.length), 4);
  const members: HouseholdMember[] = [
    ...named.map((name) => ({ name })),
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
