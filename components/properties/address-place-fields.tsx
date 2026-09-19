"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { SearchSelect } from "@/components/search-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type GeoCountry, normalizeCountry } from "@/lib/geo";

export function CountryCityDistrictFields({
  country,
  city,
  onCountryChange,
  onCityChange,
  district,
}: {
  country: string;
  city: string;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  district: UseFormRegisterReturn;
}) {
  const t = useTranslations("properties.form");
  const tCommon = useTranslations("common");
  const [countries, setCountries] = React.useState<GeoCountry[]>([]);
  const [cities, setCities] = React.useState<string[]>([]);
  const normalized = normalizeCountry(country);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/geo/countries")
      .then((res) => (res.ok ? res.json() : { countries: [] }))
      .then((body: { countries?: GeoCountry[] }) => {
        if (!cancelled) setCountries(body.countries ?? []);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!normalized) {
      setCities([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/geo/cities?country=${encodeURIComponent(normalized)}`)
      .then((res) => (res.ok ? res.json() : { cities: [] }))
      .then((body: { cities?: string[] }) => {
        if (!cancelled) setCities(body.cities ?? []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  const countryOptions = countries.map((item) => item.name);
  const cityOptions =
    city && !cities.includes(city) ? [city, ...cities] : cities;

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Field>
        <FieldLabel htmlFor="country">{t("country")}</FieldLabel>
        <SearchSelect
          id="country"
          value={normalized}
          options={countryOptions}
          onValueChange={(next) => {
            onCountryChange(next);
            if (city) onCityChange("");
          }}
          searchPlaceholder={tCommon("country_search")}
          emptyText={tCommon("country_empty")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="city">{t("city")}</FieldLabel>
        <SearchSelect
          id="city"
          value={city}
          options={cityOptions}
          onValueChange={onCityChange}
          placeholder={
            normalized ? undefined : tCommon("city_need_country")
          }
          searchPlaceholder={tCommon("city_search")}
          emptyText={tCommon("city_empty")}
          disabled={!normalized}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="district">{t("district")}</FieldLabel>
        <Input id="district" {...district} />
      </Field>
    </div>
  );
}
