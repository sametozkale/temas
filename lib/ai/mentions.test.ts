import { describe, expect, it } from "vitest";

import {
  currentRecordTitle,
  parseMentions,
  rememberRecordNames,
  toAppPath,
  type AskEntity,
} from "./mentions";

const lorem: AskEntity = {
  kind: "property",
  id: "4562d154-c542-4ace-a203-d012518908e5",
  title: "Lorem",
  href: "/properties/4562d154-c542-4ace-a203-d012518908e5",
  matchName: true,
};

const ada: AskEntity = {
  kind: "person",
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Ada Lovelace",
  href: "/properties/4562d154-c542-4ace-a203-d012518908e5/people",
  matchName: true,
};

describe("toAppPath", () => {
  it("keeps relative entity paths", () => {
    expect(toAppPath("/properties/4562d154-c542-4ace-a203-d012518908e5")).toBe(
      "/properties/4562d154-c542-4ace-a203-d012518908e5",
    );
  });

  it("strips any host when the path is in-app", () => {
    expect(
      toAppPath(
        "https://app.havenportal.app/properties/4562d154-c542-4ace-a203-d012518908e5",
      ),
    ).toBe("/properties/4562d154-c542-4ace-a203-d012518908e5");
  });
});

describe("parseMentions", () => {
  it("turns a wrapped markdown property link into one named chip", () => {
    const text =
      "there is **1 property missing a deposit**: [Lorem]\n(https://app.havenportal.app/properties/4562d154-c542-4ace-a203-d012518908e5) (rent: 1200 TRY).";
    const segments = parseMentions(text, [lorem]);
    expect(segments.filter((s) => s.type === "mention")).toEqual([
      {
        type: "mention",
        kind: "property",
        title: "Lorem",
        href: lorem.href,
        id: lorem.id,
      },
    ]);
    expect(
      segments.some((s) => s.type === "text" && s.text.includes("http")),
    ).toBe(false);
  });

  it("chips a known person or property name in a user prompt", () => {
    const segments = parseMentions("Follow up with Ada Lovelace at Lorem", [
      lorem,
      ada,
    ]);
    expect(segments.filter((s) => s.type === "mention")).toEqual([
      {
        type: "mention",
        kind: "person",
        title: "Ada Lovelace",
        href: ada.href,
        id: ada.id,
      },
      {
        type: "mention",
        kind: "property",
        title: "Lorem",
        href: lorem.href,
        id: lorem.id,
      },
    ]);
  });

  it("shows the property's current title when the saved link still says the old name", () => {
    const renamed = { ...lorem, title: "Ipsum" };
    const text =
      "Based on the workspace: [Lorem](/properties/4562d154-c542-4ace-a203-d012518908e5) (rent: 1200).";
    const segments = parseMentions(text, [renamed]);
    expect(segments.filter((s) => s.type === "mention")).toEqual([
      {
        type: "mention",
        kind: "property",
        title: "Ipsum",
        href: lorem.href,
        id: lorem.id,
      },
    ]);
  });

  it("keeps a chip on an old name and shows the current one", () => {
    const renamed = { ...lorem, title: "Ipsum" };
    const catalog = rememberRecordNames(
      [renamed],
      [{ kind: "property", href: lorem.href, title: "Lorem" }],
    );
    const segments = parseMentions("Based on the workspace: Lorem", catalog);
    expect(segments.filter((s) => s.type === "mention")).toEqual([
      {
        type: "mention",
        kind: "property",
        title: "Ipsum",
        href: lorem.href,
        id: lorem.id,
      },
    ]);
    expect(currentRecordTitle([renamed], lorem.href, "Lorem", "property")).toBe(
      "Ipsum",
    );
  });

  it("shows a person's current name when they are the only one on that link", () => {
    const renamed = { ...ada, title: "Augusta Ada" };
    const text =
      "Ask [Ada Lovelace](/properties/4562d154-c542-4ace-a203-d012518908e5/people).";
    const segments = parseMentions(text, [renamed]);
    expect(segments.filter((s) => s.type === "mention")).toEqual([
      {
        type: "mention",
        kind: "person",
        title: "Augusta Ada",
        href: ada.href,
        id: ada.id,
      },
    ]);
  });

  it("does not chip a title that is only part of a word", () => {
    const segments = parseMentions("The loremasters arrived", [lorem]);
    expect(segments.filter((s) => s.type === "mention")).toHaveLength(0);
  });
});
