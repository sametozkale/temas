import { generateObject, generateText } from "ai";
import { z } from "zod";

import { isTextConfigured, modelLabel, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { applyVariables } from "@/lib/contracts/variables";

const resolveSchema = z.object({
  values: z.record(z.string(), z.string()),
  missing: z.array(z.string()),
  conflicts: z.array(z.string()),
});

export type ContractGeneration = {
  bodyMd: string;
  missing: string[];
  conflicts: string[];
  model: string;
};

export async function generateContractDraft(input: {
  templateMd: string;
  values: Record<string, string>;
  propertyTitle: string;
  parties: { landlord?: string; tenant?: string };
}): Promise<ContractGeneration> {
  const applied = applyVariables(input.templateMd, input.values);
  if (!isTextConfigured()) {
    return {
      bodyMd: mockContractMarkdown(applied.body, input),
      missing: applied.missing,
      conflicts: [],
      model: modelLabel("sonnet"),
    };
  }

  const resolved = await resolveWithModel(input);
  const filled = applyVariables(input.templateMd, {
    ...input.values,
    ...resolved.values,
  });
  const polished = await polishWithModel({
    draft: filled.body,
    missing: [...new Set([...applied.missing, ...resolved.missing])],
    conflicts: resolved.conflicts,
    propertyTitle: input.propertyTitle,
  });
  return {
    bodyMd: polished,
    missing: [...new Set([...applied.missing, ...resolved.missing])],
    conflicts: resolved.conflicts,
    model: modelLabel("sonnet"),
  };
}

async function resolveWithModel(input: {
  templateMd: string;
  values: Record<string, string>;
  propertyTitle: string;
  parties: { landlord?: string; tenant?: string };
}) {
  const model = textModel("sonnet");
  if (!model) {
    return { values: input.values, missing: [], conflicts: [] };
  }
  const { object } = await generateObject({
    model,
    schema: resolveSchema,
    system: loadPrompt("contract-system.md"),
    prompt: JSON.stringify({
      template: input.templateMd,
      values: input.values,
      propertyTitle: input.propertyTitle,
      parties: input.parties,
    }),
  });
  return object;
}

async function polishWithModel(input: {
  draft: string;
  missing: string[];
  conflicts: string[];
  propertyTitle: string;
}) {
  const model = textModel("sonnet");
  if (!model) return input.draft;
  const { text } = await generateText({
    model,
    system: loadPrompt("contract-system.md"),
    prompt: JSON.stringify(input),
  });
  return text.trim() || input.draft;
}

function mockContractMarkdown(
  filled: string,
  input: {
    propertyTitle: string;
    parties: { landlord?: string; tenant?: string };
  },
) {
  const header = `# ${input.propertyTitle}\n\nDraft for ${input.parties.tenant ?? "the tenant"} and ${input.parties.landlord ?? "the landlord"}. This is not legal advice.\n`;
  if (filled.startsWith("#")) return filled;
  return `${header}\n${filled}`;
}
