import { describe, expect, it } from "vitest";

import { CREDIT_COSTS, creditCost } from "./credits";

describe("credit costs", () => {
  it("charges one credit for a normal ask", () => {
    expect(creditCost("ask")).toBe(1);
  });

  it("leaves housekeeping free", () => {
    expect(CREDIT_COSTS.thread_title).toBe(0);
    expect(CREDIT_COSTS.task_extract).toBe(0);
    expect(CREDIT_COSTS.auto_link).toBe(0);
    expect(CREDIT_COSTS.embedding).toBe(0);
    expect(CREDIT_COSTS.reminder_copy).toBe(0);
  });

  it("charges writes more than a question", () => {
    expect(CREDIT_COSTS.draft).toBeGreaterThan(CREDIT_COSTS.ask);
    expect(CREDIT_COSTS.contract).toBeGreaterThan(CREDIT_COSTS.draft);
    expect(CREDIT_COSTS.applicant_summary).toBeGreaterThan(CREDIT_COSTS.ask);
  });
});
