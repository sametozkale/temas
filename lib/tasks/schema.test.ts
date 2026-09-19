import { describe, expect, it } from "vitest";

import { taskPatchSchema } from "./schema";

const id = "8e096c72-9098-4375-8dcc-9b273c32de22";

describe("taskPatchSchema", () => {
  it("accepts a single field with a task id", () => {
    expect(taskPatchSchema.parse({ id, title: "  Send keys  " }).title).toBe(
      "Send keys",
    );
    expect(taskPatchSchema.parse({ id, priority: "high" }).priority).toBe(
      "high",
    );
    expect(taskPatchSchema.parse({ id, assigneeId: id }).assigneeId).toBe(id);
  });

  it("rejects an empty patch and an empty title", () => {
    expect(taskPatchSchema.safeParse({ id }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ id, title: "  " }).success).toBe(false);
  });
});
