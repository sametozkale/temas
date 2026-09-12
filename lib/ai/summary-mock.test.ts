import { describe, expect, it } from "vitest";

import { mockApplicantSummary } from "./summary-mock";

describe("mockApplicantSummary", () => {
  it("scores ability to pay and deposit answers higher", () => {
    const result = mockApplicantSummary({
      applicant: "Elif Kaya",
      answers: { income: "employed", deposit: "yes" },
    });
    expect(result.score).toBe(5);
    expect(result.summary).toContain("Elif Kaya");
  });

  it("flags risk on negative answers", () => {
    const result = mockApplicantSummary({
      applicant: "Ada",
      answers: { note: "unemployed, prior eviction" },
    });
    expect(result.score).toBe(1);
    expect(result.riskNote).toBeDefined();
  });
});
