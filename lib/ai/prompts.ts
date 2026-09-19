import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "lib/ai/prompts");

export function loadPrompt(
  name:
    | "ask-system.md"
    | "draft.md"
    | "applicant-summary.md"
    | "contract-system.md"
    | "reminder-copy.md"
    | "extract-tasks.md"
    | "name-thread.md",
) {
  return readFileSync(join(DIR, name), "utf8").trim();
}
