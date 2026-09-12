"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  createContract,
  type ContractState,
} from "@/app/(app)/properties/[id]/contracts/actions";
import { Button } from "@/components/ui/button";
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

export function ContractWizardForm({
  propertyId,
  templates,
  applications,
  defaultApplicationId,
  defaults,
}: {
  propertyId: string;
  templates: { id: string; name: string }[];
  applications: { id: string; name: string }[];
  defaultApplicationId?: string;
  defaults: { rent: string; deposit: string; currency: string };
}) {
  const t = useTranslations("contracts");
  const [state, action, pending] = useActionState<
    ContractState | undefined,
    FormData
  >(createContract, undefined);

  React.useEffect(() => {
    if (!state || state.ok) return;
    if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error === "not_found") toast.error(t("errors.not_found"));
    else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="propertyId" value={propertyId} />
      <FieldGroup>
        <Field data-invalid={errors?.templateId ? true : undefined}>
          <FieldLabel>{t("template")}</FieldLabel>
          <Select name="templateId" defaultValue={templates[0]?.id} required>
            <SelectTrigger>
              <SelectValue placeholder={t("template")} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>{t("application")}</FieldLabel>
          <Select
            name="applicationId"
            defaultValue={defaultApplicationId ?? "none"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("application_none")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("application_none")}</SelectItem>
              {applications.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="rent">{t("rent")}</FieldLabel>
            <Input
              id="rent"
              name="rent"
              defaultValue={defaults.rent}
              placeholder={defaults.currency}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deposit">{t("deposit")}</FieldLabel>
            <Input
              id="deposit"
              name="deposit"
              defaultValue={defaults.deposit}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="start-date">{t("start_date")}</FieldLabel>
            <Input id="start-date" name="startDate" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor="end-date">{t("end_date")}</FieldLabel>
            <Input id="end-date" name="endDate" type="date" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="increase">{t("increase_rate")}</FieldLabel>
          <Input id="increase" name="increaseRate" placeholder="CPI" />
        </Field>
        <Field>
          <FieldLabel htmlFor="clauses">{t("special_clauses")}</FieldLabel>
          <Textarea id="clauses" name="specialClauses" rows={4} />
        </Field>
      </FieldGroup>
      {errors ? <FieldError>{t("errors.invalid")}</FieldError> : null}
      <Button type="submit" disabled={pending || templates.length === 0}>
        {t("generate")}
      </Button>
    </form>
  );
}
