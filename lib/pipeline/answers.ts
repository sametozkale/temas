import type { FormField } from "@/lib/db/schema/forms";

export type ParsedFormAnswers = {
  answers: Record<string, unknown>;
  files: { key: string; file: File }[];
  missing: string[];
};

export function parseFormAnswers(
  fields: FormField[],
  formData: FormData,
): ParsedFormAnswers {
  const answers: Record<string, unknown> = {};
  const files: { key: string; file: File }[] = [];
  const missing: string[] = [];

  for (const field of fields) {
    const name = `field_${field.key}`;
    if (field.type === "file") {
      const value = formData.get(name);
      if (value instanceof File && value.size > 0) {
        files.push({ key: field.key, file: value });
      } else if (field.required) {
        missing.push(field.key);
      }
      continue;
    }
    if (field.type === "boolean") {
      answers[field.key] = formData.get(name) === "on";
      continue;
    }
    if (field.type === "multiselect") {
      const selected = formData.getAll(name).map(String).filter(Boolean);
      if (selected.length === 0 && field.required) missing.push(field.key);
      else answers[field.key] = selected;
      continue;
    }
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) {
      if (field.required) missing.push(field.key);
      continue;
    }
    if (field.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        missing.push(field.key);
        continue;
      }
      answers[field.key] = n;
      continue;
    }
    answers[field.key] = raw;
  }

  return { answers, files, missing };
}

export function formCompletionCookie(formId: string) {
  return `havn_form_${formId}`;
}
