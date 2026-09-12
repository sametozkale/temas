import { describe, expect, it } from "vitest";

import {
  ForbiddenError,
  can,
  canAssignRole,
  requireAbility,
  type Membership,
} from "./permissions";

const ws = "11111111-1111-1111-1111-111111111111";
const other = "22222222-2222-2222-2222-222222222222";

const member = (role: Membership["role"]): Membership => ({
  workspaceId: ws,
  userId: "u",
  role,
});

describe("permissions matrix", () => {
  it("owner can do everything", () => {
    expect(can("owner", "workspace.delete")).toBe(true);
    expect(can("owner", "billing.manage")).toBe(true);
    expect(can("owner", "members.remove")).toBe(true);
  });

  it("agent manages operations but not workspace/billing", () => {
    expect(can("agent", "properties.write")).toBe(true);
    expect(can("agent", "members.invite")).toBe(true);
    expect(can("agent", "workspace.update")).toBe(false);
    expect(can("agent", "members.remove")).toBe(false);
    expect(can("agent", "billing.manage")).toBe(false);
  });

  it("assistant cannot invite, delete properties or manage integrations", () => {
    expect(can("assistant", "properties.write")).toBe(true);
    expect(can("assistant", "members.invite")).toBe(false);
    expect(can("assistant", "properties.delete")).toBe(false);
    expect(can("assistant", "integrations.manage")).toBe(false);
  });
});

describe("requireAbility", () => {
  it("passes for permitted actions", () => {
    expect(() =>
      requireAbility(member("agent"), "properties.write"),
    ).not.toThrow();
  });

  it("throws ForbiddenError for denied actions", () => {
    expect(() => requireAbility(member("assistant"), "members.invite")).toThrow(
      ForbiddenError,
    );
  });

  it("rejects resources from another workspace even for owners", () => {
    expect(() =>
      requireAbility(member("owner"), "properties.read", {
        workspaceId: other,
      }),
    ).toThrow(ForbiddenError);
  });
});

describe("canAssignRole", () => {
  it("only owners assign roles", () => {
    expect(canAssignRole("owner", "agent")).toBe(true);
    expect(canAssignRole("agent", "assistant")).toBe(false);
  });
});
