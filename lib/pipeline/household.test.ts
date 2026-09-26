import { describe, expect, it } from "vitest";

import {
  householdCardLine,
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

  it("keeps an email on the lead and on a named person", () => {
    const household = householdOf(
      "Deniz Yılmaz",
      {
        household: [{ name: "Elif Yılmaz", email: "Elif@Example.com" }],
      },
      "Deniz@Example.com",
    );
    expect(household.members).toEqual([
      { name: "Deniz Yılmaz", email: "deniz@example.com" },
      { name: "Elif Yılmaz", email: "elif@example.com" },
    ]);
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

describe("householdCardLine", () => {
  it("keeps a job and the other people, without the lead", () => {
    const couple = householdOf("Jonas Meier", {
      household: "Anna Meier",
      occupants: 2,
    });
    expect(householdCardLine(couple, "Engineering manager, remote")).toBe(
      "Engineering manager, remote · Anna",
    );
    const helena = householdOf("Helena Saar", { occupants: 2 });
    expect(
      householdCardLine(helena, "Nurse, East Tallinn Central Hospital"),
    ).toBe("Nurse, East Tallinn Central Hospital");
    const erik = householdOf("Erik Lind", {
      household: "Sofia Lind\nNoah Lind",
      occupants: 3,
    });
    expect(
      householdCardLine(
        erik,
        "Erik — analyst; Sofia — barista; Noah — master's student",
      ),
    ).toBe("analyst · Sofia — barista · Noah — master's student");
    const lauri = householdOf("Lauri Kallas", {
      household: "Maria Kallas\nLiisa Kallas\nKarl Kallas",
      occupants: 4,
    });
    expect(
      householdCardLine(lauri, "Lauri — physician; Maria — lawyer"),
    ).toBe("physician · Maria — lawyer · Liisa, Karl");
  });
});
