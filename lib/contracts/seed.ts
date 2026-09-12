import type { ContractTemplateVariable } from "@/lib/db/schema";

export type SeedTemplate = {
  name: string;
  bodyMd: string;
  variables: ContractTemplateVariable[];
};

const COMMON: ContractTemplateVariable[] = [
  { key: "landlord_name", label: "Landlord" },
  { key: "tenant_name", label: "Tenant" },
  { key: "property_title", label: "Property" },
  { key: "property_address", label: "Address" },
  { key: "rent", label: "Monthly rent" },
  { key: "currency", label: "Currency" },
  { key: "deposit", label: "Deposit" },
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "increase_rate", label: "Increase rate" },
  { key: "special_clauses", label: "Special clauses" },
];

/** Placeholder Turkish-market templates (docs/05 §5.6). Agents can edit them. */
export const SEED_CONTRACT_TEMPLATES: SeedTemplate[] = [
  {
    name: "Residential rental agreement",
    variables: COMMON,
    bodyMd: `# Residential rental agreement

This draft is a working template for a Turkish-market residential lease. It is not legal advice.

## Parties
- Landlord: {{landlord_name}}
- Tenant: {{tenant_name}}

## Property
{{property_title}}
{{property_address}}

## Term and rent
The tenancy starts on {{start_date}} and ends on {{end_date}}.
Monthly rent: {{rent}} {{currency}}, payable in advance.
Security deposit: {{deposit}} {{currency}}.
Annual increase: {{increase_rate}}.

## Use
The tenant will use the property as a residence and keep it in good condition.

## Special clauses
{{special_clauses}}

## Signatures
Landlord: ______________________    Tenant: ______________________
`,
  },
  {
    name: "Deposit receipt",
    variables: COMMON.filter((v) =>
      [
        "landlord_name",
        "tenant_name",
        "property_title",
        "deposit",
        "currency",
        "start_date",
      ].includes(v.key),
    ),
    bodyMd: `# Deposit receipt

Received from {{tenant_name}} the amount of {{deposit}} {{currency}} as a security deposit for {{property_title}}.

Date: {{start_date}}
Received by: {{landlord_name}}

This receipt does not replace the rental agreement.
`,
  },
  {
    name: "Eviction undertaking",
    variables: COMMON.filter((v) =>
      [
        "landlord_name",
        "tenant_name",
        "property_title",
        "property_address",
        "end_date",
        "special_clauses",
      ].includes(v.key),
    ),
    bodyMd: `# Eviction undertaking

I, {{tenant_name}}, undertake to vacate {{property_title}} at {{property_address}} on or before {{end_date}} and to return the keys to {{landlord_name}}.

{{special_clauses}}

This undertaking is a draft and is not legal advice.
`,
  },
];
