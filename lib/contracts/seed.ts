import type { ContractTemplateVariable } from "@/lib/db/schema";

import { placeholderOf, type TemplateKind } from "@/lib/contracts/placeholders";

export type SeedTemplate = {
  kind: TemplateKind;
  name: string;
  bodyMd: string;
  variables: ContractTemplateVariable[];
};

function vars(...keys: string[]): ContractTemplateVariable[] {
  return keys.map((key) => {
    const found = placeholderOf(key);
    return { key, label: found?.label ?? key };
  });
}

export const JURISDICTION_CLAUSE = `Local law in {{jurisdiction}} prevails over this draft. Deposit caps, tenancy registration, rent-increase indices, cooling-off, notice periods, deposit-protection schemes and required annexes (energy certificate, how-to-rent guide, inventory) differ by country and sometimes by city. Have a qualified local lawyer review this before anyone signs. This is not legal advice.`;

/** Blank custom template — same jurisdiction warning as the starters. */
export const NEW_TEMPLATE_BODY = `# Custom template

${JURISDICTION_CLAUSE}

The assigned agent prepared this draft from the listing. The agent is not a party unless named below.

## Parties
- Landlord: {{landlord_name}}
- Tenant: {{tenant_name}}
- Agency: {{agency_name}} ({{agent_name}})

## Property
{{property_title}}
{{property_address}}

## Terms
{{special_clauses}}

Landlord: ______________________    Tenant: ______________________
`;

/** Starter pack for letting work (docs/05 §5.6). Agents edit these. */
export const SEED_CONTRACT_TEMPLATES: SeedTemplate[] = [
  {
    kind: "mandate",
    name: "Listing mandate",
    variables: vars(
      "landlord_name",
      "landlord_email",
      "agency_name",
      "agent_name",
      "property_title",
      "property_address",
      "rent",
      "currency",
      "jurisdiction",
      "special_clauses",
    ),
    bodyMd: `# Listing mandate

${JURISDICTION_CLAUSE}

The owner authorises the agency to market the property, arrange viewings, collect applications and negotiate a letting. The agent does not become a party to the eventual lease.

## Parties
- Owner / landlord: {{landlord_name}} ({{landlord_email}})
- Agency: {{agency_name}}
- Assigned agent: {{agent_name}}

## Property
- {{property_title}}
- {{property_address}}
- Asking rent: {{rent}} {{currency}} per month

## Authority
The agency may advertise the listing, host viewings, share the application form and present shortlisted applicants to the owner. It may not sign a lease, collect rent for its own account, or hold a deposit except as local rules allow and the owner instructs in writing.

## Special instructions
{{special_clauses}}

## Signatures
Owner: ______________________    Agency: ______________________
`,
  },
  {
    kind: "lease",
    name: "Residential rental agreement",
    variables: vars(
      "landlord_name",
      "landlord_email",
      "landlord_phone",
      "tenant_name",
      "tenant_email",
      "tenant_phone",
      "agency_name",
      "agent_name",
      "property_title",
      "property_address",
      "property_type",
      "bedrooms",
      "bathrooms",
      "floor",
      "area_m2",
      "rent",
      "deposit",
      "dues",
      "currency",
      "start_date",
      "end_date",
      "increase_rate",
      "inventory_list",
      "jurisdiction",
      "special_clauses",
    ),
    bodyMd: `# Residential rental agreement

${JURISDICTION_CLAUSE}

The assigned agent ({{agent_name}}, {{agency_name}}) prepared this draft from the listing. The agent is not a party unless named below.

## 1. Parties
- Landlord: {{landlord_name}}
  Email: {{landlord_email}} · Phone: {{landlord_phone}}
- Tenant: {{tenant_name}}
  Email: {{tenant_email}} · Phone: {{tenant_phone}}

## 2. Property
- {{property_title}} ({{property_type}})
- {{property_address}}
- Layout: {{bedrooms}} bedrooms, {{bathrooms}} bathrooms, floor {{floor}}, {{area_m2}} m²

The tenant will use the property as a private residence only, keep it in good repair, and not sublet or change use without written consent.

## 3. Term
Start: {{start_date}}
End: {{end_date}}
Notice, renewal and early termination follow the mandatory rules of {{jurisdiction}}.

## 4. Rent and charges
- Monthly rent: {{rent}} {{currency}}, payable in advance.
- Building dues / service charge: {{dues}} {{currency}} (confirm who pays locally).
- Increase: {{increase_rate}} (use the statutory index where the law fixes it; a contractual rate cannot undercut a mandatory cap).

## 5. Deposit
Security deposit: {{deposit}} {{currency}}.
Hold, protect and return the deposit as {{jurisdiction}} requires (caps, separate account, protection scheme, deductions, timeline). This clause does not replace those rules.

## 6. Inventory and handover
The condition of fixtures at move-in is recorded in the handover protocol. Inventory currently on the listing:

{{inventory_list}}

Meter readings, keys and remote controls are listed on the handover protocol signed on the start date.

## 7. Special clauses
{{special_clauses}}

## 8. Signatures
Landlord: ______________________    Tenant: ______________________
Agent (witness): ______________________
Date: {{start_date}}
`,
  },
  {
    kind: "offer",
    name: "Reservation offer",
    variables: vars(
      "tenant_name",
      "tenant_email",
      "landlord_name",
      "agency_name",
      "property_title",
      "property_address",
      "rent",
      "deposit",
      "currency",
      "start_date",
      "end_date",
      "jurisdiction",
      "special_clauses",
    ),
    bodyMd: `# Reservation offer

${JURISDICTION_CLAUSE}

This is an offer to take a tenancy, not a lease. It becomes binding only when the landlord accepts it in writing and any legally required cooling-off or registration step is complete.

## Applicant
{{tenant_name}} · {{tenant_email}}

## Property
{{property_title}}
{{property_address}}

## Proposed terms
- Rent: {{rent}} {{currency}} per month
- Deposit: {{deposit}} {{currency}}
- Term: {{start_date}} to {{end_date}}

## Conditions
Subject to: landlord approval, satisfactory references, proof of identity/right to rent where required, and signing the lease. A holding amount, if taken, must follow {{jurisdiction}} rules on reservation fees.

Presented by {{agency_name}} for {{landlord_name}}.

## Special clauses
{{special_clauses}}

Applicant: ______________________    Landlord: ______________________
`,
  },
  {
    kind: "deposit",
    name: "Deposit receipt",
    variables: vars(
      "landlord_name",
      "tenant_name",
      "property_title",
      "property_address",
      "deposit",
      "currency",
      "start_date",
      "agency_name",
      "jurisdiction",
    ),
    bodyMd: `# Deposit receipt

${JURISDICTION_CLAUSE}

Received from {{tenant_name}} the sum of {{deposit}} {{currency}} as a security deposit for:

{{property_title}}
{{property_address}}

Date received: {{start_date}}
Received by: {{landlord_name}} (via {{agency_name}} where the agent is instructed to collect).

The deposit is not rent. It must be held, protected and returned under the rules of {{jurisdiction}}. Deductions are limited to proven damage beyond fair wear, unpaid rent or other sums the local statute allows. This receipt does not replace the rental agreement.

Landlord / agent: ______________________    Tenant: ______________________
`,
  },
  {
    kind: "handover",
    name: "Handover protocol",
    variables: vars(
      "landlord_name",
      "tenant_name",
      "agent_name",
      "property_title",
      "property_address",
      "start_date",
      "inventory_list",
      "jurisdiction",
      "special_clauses",
    ),
    bodyMd: `# Handover protocol

${JURISDICTION_CLAUSE}

Recorded on {{start_date}} at {{property_title}}, {{property_address}}.

Present: landlord {{landlord_name}}, tenant {{tenant_name}}, agent {{agent_name}}.

## Keys and access
Keys, fobs and remotes handed over (count and which doors): ________

## Meters
Electricity: ________    Water: ________    Gas: ________    Other: ________

## Inventory and condition
The following items are on the listing. Note damage now; later claims usually fail if they were not recorded at handover.

{{inventory_list}}

Walls, floors, sanitary ware and appliances were inspected. Extra remarks:

{{special_clauses}}

## Utilities and contacts
The tenant is responsible for transferring utilities and household insurance unless {{jurisdiction}} places that duty on the landlord.

## Signatures
The parties confirm this protocol reflects the state of the property at handover.

Landlord: ______________________    Tenant: ______________________
Agent: ______________________
`,
  },
  {
    kind: "vacate",
    name: "Eviction undertaking",
    variables: vars(
      "landlord_name",
      "tenant_name",
      "property_title",
      "property_address",
      "end_date",
      "jurisdiction",
      "special_clauses",
    ),
    bodyMd: `# Vacate undertaking

${JURISDICTION_CLAUSE}

Some markets (including Turkey) use a dated vacate/eviction undertaking. In others a promise signed at the start of the tenancy is unenforceable. Do not rely on this paper instead of a lawful notice.

I, {{tenant_name}}, undertake to vacate {{property_title}} at {{property_address}} on or before {{end_date}}, to return all keys, and to leave the property in the condition required by the lease and local law, fair wear excepted.

Landlord: {{landlord_name}}

{{special_clauses}}

Tenant: ______________________    Date: ________
Witness / agent: ______________________
`,
  },
];

export function starterTemplateByName(name: string): SeedTemplate | undefined {
  return SEED_CONTRACT_TEMPLATES.find((row) => row.name === name);
}

export function templateKindForName(name: string): TemplateKind | "custom" {
  return starterTemplateByName(name)?.kind ?? "custom";
}

export function seedTemplatesMissing(existingNames: Iterable<string>) {
  const have = new Set(existingNames);
  return SEED_CONTRACT_TEMPLATES.filter((row) => !have.has(row.name));
}

/** Old stubs had no jurisdiction placeholder; do not overwrite lawyer-edited copy. */
export function shouldReplaceStarterBody(bodyMd: string) {
  return !bodyMd.includes("{{jurisdiction}}");
}
