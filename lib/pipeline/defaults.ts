import type { FormField } from "@/lib/db/schema/forms";

/** Default pipeline (docs/00 §3.3). Names are stored in English. */
export const DEFAULT_STAGES = [
  { name: "New", color: "info", isTerminal: false },
  { name: "Reviewing", color: "muted", isTerminal: false },
  { name: "Viewing Scheduled", color: "brand", isTerminal: false },
  { name: "Viewed", color: "brand", isTerminal: false },
  { name: "Shortlisted", color: "warning", isTerminal: false },
  { name: "Approved by Owner", color: "success", isTerminal: false },
  { name: "Contract", color: "info", isTerminal: false },
  { name: "Rented", color: "success", isTerminal: true },
  { name: "Rejected", color: "destructive", isTerminal: true },
] as const;

export const STAGE_NEW = "New";
export const STAGE_REVIEWING = "Reviewing";
export const STAGE_SHORTLISTED = "Shortlisted";
export const STAGE_APPROVED = "Approved by Owner";
export const STAGE_RENTED = "Rented";

/** Identity (name/email/phone) is collected separately on the public form. */
export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    key: "income",
    label: "Monthly income",
    type: "number",
    required: true,
    helpText: "Net monthly household income.",
  },
  {
    key: "employment",
    label: "Employment",
    type: "text",
    required: true,
    helpText: "Employer or occupation.",
  },
  {
    key: "move_in",
    label: "Desired move-in date",
    type: "date",
    required: true,
  },
  {
    key: "pets",
    label: "Pets",
    type: "select",
    required: true,
    options: ["No", "Yes", "Planning to"],
  },
  {
    key: "occupants",
    label: "Number of occupants",
    type: "number",
    required: true,
  },
  {
    key: "references",
    label: "References",
    type: "textarea",
    helpText: "Previous landlord or employer, if you have one.",
  },
  {
    key: "documents",
    label: "Supporting documents",
    type: "file",
    helpText: "ID, proof of income or similar — PDF or image, up to 50 MB.",
  },
];

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "date",
  "select",
  "multiselect",
  "boolean",
  "file",
] as const satisfies readonly FormField["type"][];
