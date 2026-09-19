"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createProperty, updateProperty } from "@/app/(app)/properties/actions";
import { CurrencySelect } from "@/components/currency-select";
import { CountryCityDistrictFields } from "@/components/properties/address-place-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
} from "@/lib/db/schema/properties";
import {
  FEATURE_KEYS,
  NONE_CONDITION,
  type PropertyFormInput,
} from "@/lib/properties/schema";
import { TimezoneSelect } from "@/components/timezone-select";

type Props = {
  mode: "create" | "edit";
  defaultValues: PropertyFormInput;
  propertyId?: string;
  cancelHref: string;
  agents?: { userId: string; name: string }[];
};

const ERROR_KEYS = new Set([
  "title",
  "invalid_number",
  "invalid_date",
  "timezone",
]);

export function PropertyForm({
  mode,
  defaultValues,
  propertyId,
  cancelHref,
  agents = [],
}: Props) {
  const t = useTranslations("properties.form");
  const tTypes = useTranslations("properties.types");
  const tFeatures = useTranslations("properties.features");
  const tConditions = useTranslations("properties.conditions");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const form = useForm<PropertyFormInput>({
    defaultValues,
    mode: "onBlur",
  });
  const { errors } = form.formState;

  const messageFor = (name: keyof PropertyFormInput) => {
    const raw = errors[name]?.message;
    if (!raw) return null;
    return ERROR_KEYS.has(raw)
      ? t(
          `errors.${raw as "title" | "invalid_number" | "invalid_date" | "timezone"}`,
        )
      : t("errors.generic");
  };

  const submit = form.handleSubmit((values) => {
    const raw: PropertyFormInput = { ...defaultValues, ...values };
    startTransition(async () => {
      const result =
        mode === "edit" && propertyId
          ? await updateProperty(propertyId, raw)
          : await createProperty(raw);
      if (result.ok) {
        toast.success(mode === "create" ? t("created") : t("saved"));
        if (mode === "create" && result.data?.id) {
          router.push(`/properties/${result.data.id}/edit?created=1`);
          return;
        }
        router.refresh();
      } else if (result.error === "invalid") {
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof PropertyFormInput, {
              message: msgs?.[0] ?? "generic",
            });
          }
        }
        toast.error(t("errors.generic"));
      } else {
        toast.error(t("errors.generic"));
      }
    });
  });

  const invalid = (name: keyof PropertyFormInput) =>
    errors[name] ? true : undefined;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t("section_basics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <Field data-invalid={invalid("type")}>
                <FieldLabel htmlFor="type">{t("type")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {tTypes(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field data-invalid={invalid("title")}>
                <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
                <Input
                  id="title"
                  placeholder={t("title_placeholder")}
                  autoFocus={mode === "create"}
                  {...form.register("title")}
                />
                <FieldError>{messageFor("title")}</FieldError>
              </Field>
            </div>
            <Field
              data-invalid={invalid("timezone")}
              className="sm:max-w-[320px]"
            >
              <FieldLabel htmlFor="timezone">{t("timezone")}</FieldLabel>
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <TimezoneSelect
                    id="timezone"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <FieldError>{messageFor("timezone")}</FieldError>
            </Field>
            {agents.length > 0 ? (
              <Field className="sm:max-w-[320px]">
                <FieldLabel htmlFor="assignedUserId">
                  {t("assigned_agent")}
                </FieldLabel>
                <Controller
                  control={form.control}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select
                      value={field.value || agents[0]?.userId}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="assignedUserId" className="w-full">
                        <SelectValue placeholder={t("assigned_agent")} />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.userId} value={agent.userId}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("section_address")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="addressLine">{t("address_line")}</FieldLabel>
              <Input id="addressLine" {...form.register("addressLine")} />
            </Field>
            <CountryCityDistrictFields
              country={form.watch("country")}
              city={form.watch("city")}
              onCountryChange={(value) => form.setValue("country", value)}
              onCityChange={(value) => form.setValue("city", value)}
              district={form.register("district")}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("section_pricing")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={invalid("rentAmount")}>
              <FieldLabel htmlFor="rentAmount">{t("rent")}</FieldLabel>
              <Input
                id="rentAmount"
                inputMode="decimal"
                {...form.register("rentAmount")}
              />
              <FieldError>{messageFor("rentAmount")}</FieldError>
            </Field>
            <Field data-invalid={invalid("depositAmount")}>
              <FieldLabel htmlFor="depositAmount">{t("deposit")}</FieldLabel>
              <Input
                id="depositAmount"
                inputMode="decimal"
                {...form.register("depositAmount")}
              />
              <FieldError>{messageFor("depositAmount")}</FieldError>
            </Field>
            <Field data-invalid={invalid("duesAmount")}>
              <FieldLabel htmlFor="duesAmount">{t("dues")}</FieldLabel>
              <Input
                id="duesAmount"
                inputMode="decimal"
                {...form.register("duesAmount")}
              />
              <FieldError>{messageFor("duesAmount")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">{t("currency")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <CurrencySelect
                      id="currency"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("section_details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field data-invalid={invalid("areaM2")}>
                <FieldLabel htmlFor="areaM2">{t("area")}</FieldLabel>
                <Input
                  id="areaM2"
                  inputMode="decimal"
                  {...form.register("areaM2")}
                />
                <FieldError>{messageFor("areaM2")}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="rooms">{t("rooms")}</FieldLabel>
                <Input
                  id="rooms"
                  placeholder={t("rooms_placeholder")}
                  {...form.register("rooms")}
                />
              </Field>
              <Field data-invalid={invalid("bedrooms")}>
                <FieldLabel htmlFor="bedrooms">{t("bedrooms")}</FieldLabel>
                <Input
                  id="bedrooms"
                  inputMode="numeric"
                  {...form.register("bedrooms")}
                />
                <FieldError>{messageFor("bedrooms")}</FieldError>
              </Field>
              <Field data-invalid={invalid("bathrooms")}>
                <FieldLabel htmlFor="bathrooms">{t("bathrooms")}</FieldLabel>
                <Input
                  id="bathrooms"
                  inputMode="numeric"
                  {...form.register("bathrooms")}
                />
                <FieldError>{messageFor("bathrooms")}</FieldError>
              </Field>
              <Field data-invalid={invalid("floor")}>
                <FieldLabel htmlFor="floor">{t("floor")}</FieldLabel>
                <Input
                  id="floor"
                  inputMode="numeric"
                  {...form.register("floor")}
                />
                <FieldError>{messageFor("floor")}</FieldError>
              </Field>
              <Field data-invalid={invalid("totalFloors")}>
                <FieldLabel htmlFor="totalFloors">
                  {t("total_floors")}
                </FieldLabel>
                <Input
                  id="totalFloors"
                  inputMode="numeric"
                  {...form.register("totalFloors")}
                />
                <FieldError>{messageFor("totalFloors")}</FieldError>
              </Field>
              <Field data-invalid={invalid("yearBuilt")}>
                <FieldLabel htmlFor="yearBuilt">{t("year_built")}</FieldLabel>
                <Input
                  id="yearBuilt"
                  inputMode="numeric"
                  {...form.register("yearBuilt")}
                />
                <FieldError>{messageFor("yearBuilt")}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="condition">{t("condition")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <Select
                      value={field.value || NONE_CONDITION}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="condition" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_CONDITION}>
                          {tConditions("none")}
                        </SelectItem>
                        {PROPERTY_CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {tConditions(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field data-invalid={invalid("availableFrom")}>
                <FieldLabel htmlFor="availableFrom">
                  {t("available_from")}
                </FieldLabel>
                <Input
                  id="availableFrom"
                  type="date"
                  {...form.register("availableFrom")}
                />
                <FieldError>{messageFor("availableFrom")}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>{t("features")}</FieldLabel>
              <Controller
                control={form.control}
                name="features"
                render={({ field }) => {
                  const selected = field.value ?? [];
                  return (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FEATURE_KEYS.map((key) => {
                        const checked = selected.includes(key);
                        return (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-data-checked:border-foreground/30"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                field.onChange(
                                  v
                                    ? [...selected, key]
                                    : selected.filter((k) => k !== key),
                                )
                              }
                            />
                            {tFeatures(key)}
                          </label>
                        );
                      })}
                    </div>
                  );
                }}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">{t("description")}</FieldLabel>
              <Textarea
                id="description"
                rows={5}
                placeholder={t("description_placeholder")}
                {...form.register("description")}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(cancelHref)}
          disabled={pending}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {mode === "create" ? t("create") : t("save")}
        </Button>
      </div>
    </form>
  );
}
