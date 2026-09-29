import { describe, expect, it } from "vitest";

import { jsonLdListing, readPageSignals } from "./import-listing";

const HTML = `<!doctype html><html><head>
<title>Riverside Flat | Example Estates</title>
<meta property="og:title" content="Riverside Flat, 2+1 with balcony">
<meta property="og:image" content="/photos/1.jpg">
<script type="application/ld+json">{"@type":"Apartment","image":["https://cdn.example.com/2.jpg"]}</script>
<style>.x{}</style></head>
<body><img src="/logo.svg"><img data-src="https://cdn.example.com/3.webp">
<p>Rent 25.000 TL</p><p>95 m2</p><script>var a=1</script></body></html>`;

describe("readPageSignals", () => {
  const signals = readPageSignals(HTML, new URL("https://example.com/l/1"));

  it("prefers OpenGraph for the title", () => {
    expect(signals.title).toBe("Riverside Flat, 2+1 with balcony");
  });

  it("collects absolute https images and skips logos", () => {
    expect(signals.images).toEqual([
      "https://example.com/photos/1.jpg",
      "https://cdn.example.com/2.jpg",
      "https://cdn.example.com/3.webp",
    ]);
  });

  it("strips scripts and styles from the text", () => {
    expect(signals.text).toContain("Rent 25.000 TL");
    expect(signals.text).not.toContain("var a");
    expect(signals.jsonLd).toHaveLength(1);
  });
});

describe("jsonLdListing", () => {
  it("maps schema.org listing fields", () => {
    const draft = jsonLdListing([
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": ["Apartment", "Product"],
            name: "Canal loft &amp; terrace",
            floorSize: { "@type": "QuantitativeValue", value: 84, unitCode: "MTK" },
            numberOfRooms: 3,
            numberOfBedrooms: "2",
            numberOfBathroomsTotal: 1,
            address: {
              "@type": "PostalAddress",
              streetAddress: "Keizersgracht 12",
              addressLocality: "Amsterdam",
              addressCountry: "NL",
            },
            offers: { "@type": "Offer", price: "2150", priceCurrency: "eur" },
          },
        ],
      },
    ]);
    expect(draft).toMatchObject({
      title: "Canal loft & terrace",
      areaM2: "84",
      rooms: "3",
      bedrooms: "2",
      bathrooms: "1",
      addressLine: "Keizersgracht 12",
      city: "Amsterdam",
      country: "NL",
      rentAmount: "2150",
      currency: "EUR",
    });
  });

  it("ignores pages without a listing node", () => {
    expect(jsonLdListing([{ "@type": "Organization", name: "Example Estates" }])).toEqual({});
  });
});
