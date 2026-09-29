/**
 * The verification model wrote raw tool results as assistant text
 * (`Scripted: [{ type: "tool-result", ... }]`). That is chain-of-thought
 * material, not a message. Returns one step per result, or null when the
 * text is a normal reply.
 */
export type ThoughtStep = {
  text: string;
  tool: string | null;
  details: string[];
};

/** Pull complete `"summary"` strings out of a dump whose JSON was cut off. */
function summariesIn(text: string): ThoughtStep[] {
  const steps: ThoughtStep[] = [];
  for (const match of text.matchAll(/"summary"\s*:\s*"((?:\\.|[^"\\])*)"/g)) {
    try {
      const value = JSON.parse(`"${match[1]}"`) as unknown;
      if (typeof value === "string" && value.trim()) {
        steps.push({ text: value.trim(), tool: null, details: [] });
      }
    } catch {
      // The summary string itself was cut off.
    }
  }
  return steps;
}

/** A record chip inside a JSON string (`[Name](/properties/…)`) breaks the parse. */
function withoutMentions(text: string) {
  return text.replace(/\[([^\]"{]+)\]\((?:\/[^)\s]*)\)/g, "$1");
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

export function toolDumpSteps(text: string): ThoughtStep[] | null {
  const trimmed = text.trim();
  const json = trimmed.startsWith("Scripted:")
    ? trimmed.slice("Scripted:".length).trim()
    : trimmed;
  const dump =
    trimmed.startsWith("Scripted:") && trimmed.includes('"tool-result"');
  if (!json.startsWith("[")) return dump ? [] : null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(withoutMentions(json));
  } catch {
    return dump ? summariesIn(json) : null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return dump ? [] : null;
  const steps: ThoughtStep[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return dump ? steps : null;
    const record = item as { type?: unknown; toolName?: unknown; output?: unknown };
    if (record.type !== "tool-result") return dump ? steps : null;
    const output = record.output;
    const value = (
      output && typeof output === "object" && "value" in output
        ? (output as { value?: unknown }).value
        : output
    ) as { summary?: unknown; details?: unknown } | undefined;
    const summary = value && typeof value === "object" ? value.summary : undefined;
    if (typeof summary === "string" && summary.trim()) {
      steps.push({
        text: summary.trim(),
        tool: typeof record.toolName === "string" ? record.toolName : null,
        details: stringsOf(value?.details),
      });
    }
  }
  return steps;
}
