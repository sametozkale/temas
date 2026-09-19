"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createProperty } from "@/app/(app)/properties/actions";
import { CurrencySelect } from "@/components/currency-select";
import { CountryCityDistrictFields } from "@/components/properties/address-place-fields";
import { PROPERTY_TYPE_ICONS } from "@/components/properties/property-badges";
import { Icon } from "@/components/icons";
import { pageTitleClassName } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const STEPS = ["type", "title", "address", "pricing", "details"] as const;

type Props = {
  defaultValues: PropertyFormInput;
  cancelHref: string;
  agents?: { userId: string; name: string }[];
};

const ERROR_KEYS = new Set([
  "title",
  "invalid_number",
  "invalid_date",
  "timezone",
]);

export function PropertyCreateWizard({
  defaultValues,
  cancelHref,
  agents = [],
}: Props) {
  const t = useTranslations("properties.form");
  const tTypes = useTranslations("properties.types");
  const tFeatures = useTranslations("properties.features");
  const tConditions = useTranslations("properties.conditions");
  const router = useRouter();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<PropertyFormInput>({
    defaultValues,
    mode: "onBlur",
  });
  const { errors } = form.formState;
  const step = STEPS[stepIndex]!;
  const last = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const messageFor = (name: keyof PropertyFormInput) => {
    const raw = errors[name]?.message;
    if (!raw) return null;
    return ERROR_KEYS.has(raw)
      ? t(
          `errors.${raw as "title" | "invalid_number" | "invalid_date" | "timezone"}`,
        )
      : t("errors.generic");
  };

  const invalid = (name: keyof PropertyFormInput) =>
    errors[name] ? true : undefined;

  async function goNext() {
    if (step === "title") {
      const title = form.getValues("title").trim();
      if (title.length < 2) {
        form.setError("title", { message: "title" });
        return;
      }
      form.clearErrors("title");
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  const submit = form.handleSubmit((values) => {
    const raw: PropertyFormInput = { ...defaultValues, ...values };
    startTransition(async () => {
      const result = await createProperty(raw);
      if (result.ok) {
        toast.success(t("created"));
        if (result.data?.id) {
          router.push(`/properties/${result.data.id}/edit?created=1`);
          return;
        }
        router.push("/properties");
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

  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) return;
    if (
      target instanceof HTMLElement &&
      (target.closest("[data-slot=command-input]") ||
        target.getAttribute("role") === "combobox")
    ) {
      return;
    }
    if (last) return;
    event.preventDefault();
    void goNext();
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="shrink-0 space-y-3 px-1">
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label={t("step_of", {
            current: stepIndex + 1,
            total: STEPS.length,
          })}
        >
          <div
            className="h-full bg-brand motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("create_title")}</span>
          <span>
            {t("step_of", { current: stepIndex + 1, total: STEPS.length })}
          </span>
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
        <div className="my-auto space-y-6 py-8">
          <div className="space-y-1">
            <h1 className={pageTitleClassName}>{t(`question_${step}`)}</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              {t(`hint_${step}`)}
            </p>
          </div>
          {step === "type" ? (
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label={t("type")}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                >
                  {PROPERTY_TYPES.map((type) => {
                    const selected = field.value === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.onChange(type)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-colors",
                          selected
                            ? "border-foreground/25 bg-muted/60"
                            : "hover:bg-muted/40",
                        )}
                      >
                        <Icon
                          icon={PROPERTY_TYPE_ICONS[type]}
                          size={20}
                          className="text-muted-foreground"
                        />
                        {tTypes(type)}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          ) : null}

          {step === "title" ? (
            <FieldGroup>
              <Field data-invalid={invalid("title")}>
                <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
                <Input
                  id="title"
                  placeholder={t("title_placeholder")}
                  autoFocus
                  {...form.register("title", {
                    validate: (value) =>
                      value.trim().length >= 2 ? true : "title",
                  })}
                />
                <FieldError>{messageFor("title")}</FieldError>
              </Field>
              {agents.length > 0 ? (
                <Field>
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
          ) : null}

          {step === "address" ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="addressLine">
                  {t("address_line")}
                </FieldLabel>
                <Input
                  id="addressLine"
                  autoFocus
                  {...form.register("addressLine")}
                />
              </Field>
              <CountryCityDistrictFields
                country={form.watch("country")}
                city={form.watch("city")}
                onCountryChange={(value) => form.setValue("country", value)}
                onCityChange={(value) => form.setValue("city", value)}
                district={form.register("district")}
              />
            </FieldGroup>
          ) : null}

          {step === "pricing" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={invalid("rentAmount")}>
                <FieldLabel htmlFor="rentAmount">{t("rent")}</FieldLabel>
                <Input
                  id="rentAmount"
                  inputMode="decimal"
                  autoFocus
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
          ) : null}

          {step === "details" ? (
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field data-invalid={invalid("areaM2")}>
                  <FieldLabel htmlFor="areaM2">{t("area")}</FieldLabel>
                  <Input
                    id="areaM2"
                    inputMode="decimal"
                    autoFocus
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
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                <FieldLabel htmlFor="description">
                  {t("description")}
                </FieldLabel>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder={t("description_placeholder")}
                  {...form.register("description")}
                />
              </Field>
            </FieldGroup>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-secondary-foreground"
              disabled={pending}
              onClick={() => {
                if (stepIndex === 0) {
                  router.push(cancelHref);
                  return;
                }
                setStepIndex((i) => i - 1);
              }}
            >
              {stepIndex === 0 ? t("cancel") : t("back")}
            </Button>
            {last ? (
              <Button type="submit" disabled={pending}>
                {t("create")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending}
                onClick={() => void goNext()}
              >
                {t("continue")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
