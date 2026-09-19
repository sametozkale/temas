import { describe, expect, it } from "vitest";

import { feedbackSchema } from "./schema";

describe("feedbackSchema", () => {
  it("requires a short note", () => {
    expect(feedbackSchema.safeParse({ body: "too" }).success).toBe(false);
    expect(
      feedbackSchema.safeParse({ body: "The calendar toolbar is too loose." })
        .success,
    ).toBe(true);
  });
});
