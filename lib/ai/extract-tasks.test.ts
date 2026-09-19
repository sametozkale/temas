import { describe, expect, it } from "vitest";

import {
  mockExtractTasks,
  planInboxTaskExtract,
  resolveCompletedFingerprints,
  taskFingerprint,
} from "@/lib/ai/extract-tasks";

describe("taskFingerprint", () => {
  it("normalises case, punctuation and spacing", () => {
    expect(taskFingerprint("  Call the Owner — keys! ")).toBe(
      "call the owner keys",
    );
  });
});

describe("resolveCompletedFingerprints", () => {
  const existing = [
    { fingerprint: "send the contract" },
    { fingerprint: "chase the keys" },
  ];

  it("matches by fingerprint or normalised title and ignores unknown ids", () => {
    expect(
      resolveCompletedFingerprints(
        [
          { fingerprint: "send the contract" },
          { title: "Chase the keys!" },
          { fingerprint: "invented" },
        ],
        existing,
      ),
    ).toEqual(["send the contract", "chase the keys"]);
  });
});

describe("planInboxTaskExtract", () => {
  it("inserts new open actions and completes existing ones the thread finished", () => {
    const plan = planInboxTaskExtract({
      existing: [{ fingerprint: "send the contract" }],
      open: [
        {
          title: "Send the contract",
          priority: "high",
        },
        {
          title: "Book a viewing",
          priority: "medium",
        },
      ],
      completed: [{ title: "Send the contract" }],
    });
    expect(plan.completeFingerprints).toEqual(["send the contract"]);
    expect(plan.insert.map((item) => item.title)).toEqual(["Book a viewing"]);
  });
});

describe("mockExtractTasks", () => {
  it("returns nothing for chit-chat", () => {
    expect(
      mockExtractTasks({ subject: "Hi", lastInbound: "Thanks, see you" }).tasks,
    ).toHaveLength(0);
  });

  it("suggests a follow-up when the inbound looks actionable", () => {
    const { tasks } = mockExtractTasks({
      subject: "Keys",
      lastInbound: "Please send the contract when you can.",
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toMatch(/follow up/i);
  });

  it("marks existing tasks done when the thread says they were finished", () => {
    const result = mockExtractTasks({
      subject: "Keys",
      lastInbound: "Thanks, we received the keys yesterday.",
      existing: [
        { fingerprint: "chase the keys", title: "Chase the keys" },
      ],
    });
    expect(result.tasks).toHaveLength(0);
    expect(result.completed).toEqual([
      { fingerprint: "chase the keys" },
    ]);
  });
});
