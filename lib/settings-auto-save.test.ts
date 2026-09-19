import { describe, expect, it } from "vitest";

import { settingsFormKey, toSettingsFormData } from "./settings-auto-save";

describe("settings auto-save", () => {
  it("keys values in a stable order", () => {
    expect(settingsFormKey({ tone: "short", language: "tr" })).toBe(
      "language=tr&tone=short",
    );
    expect(settingsFormKey({ language: "tr", tone: "short" })).toBe(
      "language=tr&tone=short",
    );
  });

  it("skips identical snapshots", () => {
    const a = settingsFormKey({ name: "Temas", timezone: "Europe/Istanbul" });
    const b = settingsFormKey({ timezone: "Europe/Istanbul", name: "Temas" });
    expect(a).toBe(b);
  });

  it("builds FormData from the snapshot", () => {
    const formData = toSettingsFormData({ fullName: "Ada", phone: "" });
    expect(formData.get("fullName")).toBe("Ada");
    expect(formData.get("phone")).toBe("");
  });
});
