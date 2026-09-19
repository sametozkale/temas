import { describe, expect, it } from "vitest";

import {
  householdLabel,
  householdMemberLine,
  householdOf,
  isHouseholdAnswerKey,
} from "@/lib/pipeline/household";

describe("householdOf", () => {
  it("is a single occupant when nothing else is recorded", () => {
    const household = householdOf("Selin Arslan", {});
    expect(household.size).toBe(1);
    expect(household.members).toEqual([{ name: "Selin Arslan" }]);
    expect(household.sharedLastName).toBeNull();
  });

  it("adds unnamed seats from occupants", () => {
    const household = householdOf("Selin Arslan", { occupants: 2 });
    expect(household.size).toBe(2);
    expect(household.members).toEqual([
      { name: "Selin Arslan" },
      { name: "", unnamed: true },
    ]);
  });

  it("reads named others from a textarea", () => {
    const household = householdOf("Selin Arslan", {
      occupants: 2,
      household: "Kerem Arslan",
    });
    expect(household.members.map((m) => m.name)).toEqual([
      "Selin Arslan",
      "Kerem Arslan",
    ]);
    expect(household.sharedLastName).toBe("Arslan");
    expect(householdMemberLine(household)).toBe("Selin · Kerem");
  });

  it("reads an array of household objects and skips the duplicate lead", () => {
    const household = householdOf("Deniz Yılmaz", {
      occupants: 3,
      household: [
        { name: "Deniz Yılmaz", relation: "primary" },
        { name: "Elif Yılmaz", relation: "partner" },
        { name: "Can Yılmaz", relation: "child" },
      ],
    });
    expect(household.size).toBe(3);
    expect(household.sharedLastName).toBe("Yılmaz");
    expect(householdMemberLine(household)).toBe("Deniz · Elif · Can");
  });

  it("does not shrink below the named people", () => {
    const household = householdOf("Ada", {
      occupants: 1,
      household: "Bora\nCem",
    });
    expect(household.size).toBe(3);
    expect(household.sharedLastName).toBeNull();
  });

  it("labels a shared last name as a family", () => {
    const household = householdOf("Selin Arslan", {
      household: "Kerem Arslan",
    });
    expect(
      householdLabel(household, {
        family: (name) => `${name} family`,
        plus: (name, count) => `${name} +${count}`,
      }),
    ).toBe("Arslan family");
  });
});

describe("isHouseholdAnswerKey", () => {
  it("hides household fields from generic answer dumps", () => {
    expect(isHouseholdAnswerKey("household")).toBe(true);
    expect(isHouseholdAnswerKey("occupants")).toBe(true);
    expect(isHouseholdAnswerKey("income")).toBe(false);
  });
});
