import type { ContractTemplateVariable } from "@/lib/db/schema";

import { extractVariables } from "./variables";

export const TEMPLATE_KINDS = [
  "mandate",
  "lease",
  "offer",
  "deposit",
  "handover",
  "vacate",
] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];
export type TemplateKindOrCustom = TemplateKind | "custom";

export const TEMPLATE_KIND_ORDER: readonly TemplateKindOrCustom[] = [
  ...TEMPLATE_KINDS,
  "custom",
];

export const PLACEHOLDER_GROUPS = [
  "parties",
  "property",
  "money",
  "term",
  "agency",
] as const;
export type PlaceholderGroup = (typeof PLACEHOLDER_GROUPS)[number];

export type ContractPlaceholder = ContractTemplateVariable & {
  group: PlaceholderGroup;
};

/**
 * Placeholders contract mode can fill from the listing, people, inventory
 * and the generate form (docs/05 §5). Unknown {{keys}} stay visible.
 */
export const CONTRACT_PLACEHOLDERS: readonly ContractPlaceholder[] = [
  { key: "landlord_name", label: "Landlord", group: "parties" },
  { key: "landlord_email", label: "Landlord email", group: "parties" },
  { key: "landlord_phone", label: "Landlord phone", group: "parties" },
  { key: "tenant_name", label: "Tenant", group: "parties" },
  { key: "tenant_email", label: "Tenant email", group: "parties" },
  { key: "tenant_phone", label: "Tenant phone", group: "parties" },
  { key: "property_title", label: "Property", group: "property" },
  { key: "property_address", label: "Address", group: "property" },
  { key: "property_city", label: "City", group: "property" },
  { key: "property_country", label: "Country", group: "property" },
  { key: "property_type", label: "Property type", group: "property" },
  { key: "bedrooms", label: "Bedrooms", group: "property" },
  { key: "bathrooms", label: "Bathrooms", group: "property" },
  { key: "floor", label: "Floor", group: "property" },
  { key: "area_m2", label: "Area m²", group: "property" },
  { key: "inventory_list", label: "Inventory", group: "property" },
  { key: "rent", label: "Monthly rent", group: "money" },
  { key: "deposit", label: "Deposit", group: "money" },
  { key: "dues", label: "Building dues", group: "money" },
  { key: "currency", label: "Currency", group: "money" },
  { key: "start_date", label: "Start date", group: "term" },
  { key: "end_date", label: "End date", group: "term" },
  { key: "increase_rate", label: "Increase rate", group: "term" },
  { key: "special_clauses", label: "Special clauses", group: "term" },
  { key: "jurisdiction", label: "Jurisdiction", group: "term" },
  { key: "agency_name", label: "Agency", group: "agency" },
  { key: "agent_name", label: "Assigned agent", group: "agency" },
];

const PLACEHOLDER_BY_KEY = new Map(
  CONTRACT_PLACEHOLDERS.map((item) => [item.key, item]),
);

export function placeholderOf(key: string): ContractPlaceholder | undefined {
  return PLACEHOLDER_BY_KEY.get(key);
}

export function variablesFromBody(bodyMd: string): ContractTemplateVariable[] {
  return extractVariables(bodyMd).map((key) => ({
    key,
    label: PLACEHOLDER_BY_KEY.get(key)?.label ?? key,
  }));
}
