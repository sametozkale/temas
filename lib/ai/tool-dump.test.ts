import { describe, expect, it } from "vitest";

import { toolDumpSteps } from "./tool-dump";

const texts = (text: string) => toolDumpSteps(text)?.map((step) => step.text);

describe("toolDumpSteps", () => {
  it("reads the summary out of a scripted tool dump", () => {
    const text =
      'Scripted: [{"type":"tool-result","toolName":"inviteMember","output":{"type":"json","value":{"ok":true,"summary":"Invited ask.verify@example.com as assistant."}}}]';
    expect(toolDumpSteps(text)).toEqual([
      { text: "Invited ask.verify@example.com as assistant.", tool: "inviteMember", details: [] },
    ]);
  });

  it("keeps detail lines for an expandable step", () => {
    const text = JSON.stringify([
      {
        type: "tool-result",
        toolName: "listProperties",
        output: { type: "json", value: { summary: "Found 2 listings.", details: ["Kadriorg loft", 3, "Canal loft"] } },
      },
    ]);
    expect(toolDumpSteps(text)?.[0]?.details).toEqual(["Kadriorg loft", "Canal loft"]);
  });

  it("still reads a summary that contains a record link", () => {
    const summary =
      'Updated rentAmount on "[Kadriorg loft](/properties/4562d154-c542-4ace-a203-d012518908e5)".';
    const text = `Scripted: ${JSON.stringify([
      { type: "tool-result", output: { type: "json", value: { ok: true, summary } } },
    ])}`;
    expect(texts(text)).toEqual(['Updated rentAmount on "Kadriorg loft".']);
  });

  it("hides a scripted dump that is not valid JSON", () => {
    expect(toolDumpSteps('Scripted: [{"type":"tool-result",')).toEqual([]);
  });

  it("keeps a summary from a dump that was cut off", () => {
    const text =
      'Scripted: [{"type":"tool-result","output":{"type":"json","value":{"ok":true,"summary":"Updated rentAmount on \\"Kadriorg loft\\".","href":"/properties/4562';
    expect(texts(text)).toEqual(['Updated rentAmount on "Kadriorg loft".']);
  });

  it("leaves a normal reply alone", () => {
    expect(toolDumpSteps("Scripted reply.")).toBeNull();
    expect(toolDumpSteps("Invited Maya as an assistant.")).toBeNull();
  });
});
