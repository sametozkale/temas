import { describe, expect, it } from "vitest";

import { renameThreadSchema, threadTitleSchema } from "./schema";

describe("threadTitleSchema", () => {
  it("trims and accepts a short name", () => {
    expect(threadTitleSchema.parse("  Viewings this month  ")).toBe(
      "Viewings this month",
    );
  });

  it("rejects empty and over-long names", () => {
    expect(threadTitleSchema.safeParse("").success).toBe(false);
    expect(threadTitleSchema.safeParse(" ").success).toBe(false);
    expect(threadTitleSchema.safeParse("a".repeat(61)).success).toBe(false);
  });
});

describe("renameThreadSchema", () => {
  it("requires a uuid and title", () => {
    expect(
      renameThreadSchema.safeParse({
        threadId: "not-a-uuid",
        title: "Hello",
      }).success,
    ).toBe(false);
    expect(
      renameThreadSchema.safeParse({
        threadId: "8e096c72-9098-4375-8dcc-9b273c32de22",
        title: "Hello",
      }).success,
    ).toBe(true);
  });
});
