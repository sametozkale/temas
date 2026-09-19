import { formatAddress, formatFloor } from "@/lib/format";
import type { PropertyAddress } from "@/lib/db/schema";
import { mergeValues } from "@/lib/contracts/variables";

export type InventoryLine = {
  name: string;
  quantity: number;
  condition: string | null;
};

export type ContractValueInput = {
  landlordName?: string | null;
  landlordEmail?: string | null;
  landlordPhone?: string | null;
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  agencyName?: string | null;
  agentName?: string | null;
  title: string;
  type: string;
  address: PropertyAddress | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  areaM2?: string | null;
  rent?: string | null;
  deposit?: string | null;
  dues?: string | null;
  currency: string;
  inventory: InventoryLine[];
  overrides: Record<string, string | null | undefined>;
};

export function formatInventoryList(items: InventoryLine[]) {
  if (items.length === 0) return "No inventory items recorded in Temas.";
  return items
    .map((item) => {
      const qty = item.quantity > 1 ? `${item.quantity} × ` : "";
      const condition = item.condition ? ` (${item.condition})` : "";
      return `${qty}${item.name}${condition}`;
    })
    .join("; ");
}

export function buildContractValues(input: ContractValueInput) {
  const country = input.address?.country?.trim() || "";
  return mergeValues(
    {
      landlord_name: input.landlordName,
      landlord_email: input.landlordEmail,
      landlord_phone: input.landlordPhone,
      tenant_name: input.tenantName,
      tenant_email: input.tenantEmail,
      tenant_phone: input.tenantPhone,
      agency_name: input.agencyName,
      agent_name: input.agentName,
      property_title: input.title,
      property_address: formatAddress(input.address) ?? "",
      property_city: input.address?.city ?? "",
      property_country: country,
      property_type: input.type,
      bedrooms: input.bedrooms != null ? String(input.bedrooms) : "",
      bathrooms: input.bathrooms != null ? String(input.bathrooms) : "",
      floor: formatFloor(input.floor, input.totalFloors) ?? "",
      area_m2: input.areaM2,
      inventory_list: formatInventoryList(input.inventory),
      rent: input.rent,
      deposit: input.deposit,
      dues: input.dues,
      currency: input.currency,
      jurisdiction: country,
    },
    input.overrides,
  );
}
