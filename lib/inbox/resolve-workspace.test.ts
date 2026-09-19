import { describe, expect, it } from "vitest";

import { pickMailboxWorkspace } from "./resolve-workspace";

const contacts = [
  {
    id: "c-a",
    workspaceId: "ws-a",
    email: "elif@temas.test",
    phone: "+905551110000",
  },
  {
    id: "c-b",
    workspaceId: "ws-b",
    email: "elif@temas.test",
    phone: null,
  },
];

const properties = [
  { id: "p-a", workspaceId: "ws-a", title: "Kadıköy bright 2+1" },
  { id: "p-b", workspaceId: "ws-b", title: "Beşiktaş loft" },
];

describe("pickMailboxWorkspace", () => {
  it("uses the unique contact match", () => {
    expect(
      pickMailboxWorkspace({
        homeWorkspaceId: "ws-home",
        membershipWorkspaceIds: ["ws-a", "ws-home"],
        contacts,
        properties,
        email: "elif@temas.test",
        phone: null,
        haystack: "hello",
      }),
    ).toEqual({ workspaceId: "ws-a", contactId: "c-a" });
  });

  it("prefers the workspace whose property title is in the body", () => {
    expect(
      pickMailboxWorkspace({
        homeWorkspaceId: "ws-a",
        membershipWorkspaceIds: ["ws-a", "ws-b"],
        contacts,
        properties,
        email: "elif@temas.test",
        phone: null,
        haystack: "Is Beşiktaş loft still free?",
      }),
    ).toEqual({ workspaceId: "ws-b", contactId: "c-b" });
  });

  it("falls back to the home workspace when nothing matches", () => {
    expect(
      pickMailboxWorkspace({
        homeWorkspaceId: "ws-home",
        membershipWorkspaceIds: ["ws-a", "ws-home"],
        contacts,
        properties,
        email: "unknown@temas.test",
        phone: null,
        haystack: "hello",
      }),
    ).toEqual({ workspaceId: "ws-home", contactId: null });
  });
});
