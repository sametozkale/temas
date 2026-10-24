import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import { errorScreen } from "@/messages/error-screen";

import {
  APP_OMIT_NAMESPACES,
  MARKETING_CLIENT_PATHS,
  omitMessages,
  pickMessages,
} from "./client-messages";

describe("pickMessages", () => {
  it("keeps only the requested branches and nests them", () => {
    const picked = pickMessages(en, MARKETING_CLIENT_PATHS);
    expect(picked).toHaveProperty("errors.title", en.errors.title);
    expect(picked).toHaveProperty("marketing.mock");
    expect(picked).toHaveProperty("marketing.plans");
    expect(picked).not.toHaveProperty("marketing.features");
    expect(picked).not.toHaveProperty("home");
    expect(picked).not.toHaveProperty("inbox");
  });

  it("skips paths that are not in the catalog", () => {
    expect(pickMessages(en, ["missing.branch"])).toEqual({});
  });
});

describe("errorScreen", () => {
  it("matches the errors namespace in en.json", () => {
    expect(en.errors.title).toBe(errorScreen.title);
    expect(en.errors.description).toBe(errorScreen.description);
    expect(en.errors.retry).toBe(errorScreen.retry);
  });
});

describe("omitMessages", () => {
  it("drops the marketing catalog from the app payload", () => {
    const omitted = omitMessages(en, APP_OMIT_NAMESPACES);
    expect(omitted).not.toHaveProperty("marketing");
    expect(omitted).toHaveProperty("nav");
    expect(omitted).toHaveProperty("home");
    expect(omitted).toHaveProperty("errors");
  });
});
