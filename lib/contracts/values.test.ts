import { describe, expect, it } from "vitest";

import { buildContractValues, formatInventoryList } from "./values";

describe("contract values", () => {
  it("lists inventory with quantity and condition", () => {
    expect(formatInventoryList([])).toBe(
      "No inventory items recorded in Temas.",
    );
    expect(
      formatInventoryList([
        { name: "Fridge", quantity: 1, condition: "good" },
        { name: "Chair", quantity: 4, condition: null },
      ]),
    ).toBe("Fridge (good); 4 × Chair");
  });

  it("fills from the listing and lets the generate form override money and dates", () => {
    const values = buildContractValues({
      landlordName: "Ayse Owner",
      landlordEmail: "ayse@example.com",
      landlordPhone: "+90 555 000 00 01",
      tenantName: "Elif Kaya",
      tenantEmail: "elif@example.com",
      tenantPhone: null,
      agencyName: "Temas Demo",
      agentName: "Samet",
      title: "Kadıköy bright 2+1",
      type: "apartment",
      address: {
        line: "Moda Cd. 12",
        district: "Kadıköy",
        city: "Istanbul",
        country: "Turkey",
      },
      bedrooms: 2,
      bathrooms: 1,
      floor: 3,
      totalFloors: 5,
      areaM2: "95",
      rent: "25000",
      deposit: "50000",
      dues: "1500",
      currency: "TRY",
      inventory: [{ name: "Fridge", quantity: 1, condition: "good" }],
      overrides: {
        rent: "26000",
        start_date: "2026-10-01",
        special_clauses: "No pets.",
      },
    });

    expect(values.landlord_name).toBe("Ayse Owner");
    expect(values.tenant_name).toBe("Elif Kaya");
    expect(values.agency_name).toBe("Temas Demo");
    expect(values.agent_name).toBe("Samet");
    expect(values.property_address).toContain("Kadıköy");
    expect(values.property_city).toBe("Istanbul");
    expect(values.jurisdiction).toBe("Turkey");
    expect(values.property_country).toBe("Turkey");
    expect(values.floor).toBe("3 / 5");
    expect(values.inventory_list).toBe("Fridge (good)");
    expect(values.rent).toBe("26000");
    expect(values.deposit).toBe("50000");
    expect(values.dues).toBe("1500");
    expect(values.start_date).toBe("2026-10-01");
    expect(values.special_clauses).toBe("No pets.");
  });
});
