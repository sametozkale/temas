"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { patchProperty } from "@/app/(app)/properties/actions";
import { CurrencySelect } from "@/components/currency-select";
import { Icon, Image02Icon, Location01Icon } from "@/components/icons";
import { pageTitleClassName } from "@/components/page-header";
import { PropertyStatusBadge } from "@/components/properties/property-badges";
import { TimezoneSelect } from "@/components/timezone-select";
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
  type PropertyStatus,
  type PropertyType,
} from "@/lib/db/schema/properties";
import {
  formatFloor,
  formatMoney,
  formatNumber,
  formatPricePerM2,
} from "@/lib/format";
import {
  NONE_CONDITION,
  type PropertyFormInput,
} from "@/lib/properties/schema";
import { STATUS_ORDER } from "@/lib/properties/status";
import { cn } from "@/lib/utils";

export type PropertyRailValues = {
  title: string;
  description: string;
  addressLine: string;
  district: string;
  city: string;
  country: string;
  type: PropertyType;
  timezone: string;
  currency: string;
  rentAmount: string;
  depositAmount: string;
  duesAmount: string;
  areaM2: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  condition: string;
  availableFrom: string;
  status: PropertyStatus;
};

const quietControl =
  "h-8 w-full border-transparent bg-transparent px-1.5 font-medium shadow-none hover:bg-muted focus-visible:border-ring focus-visible:bg-card";

export function PropertyRecordRail({
  propertyId,
  coverUrl,
  values,
  canWrite,
}: {
  propertyId: string;
  coverUrl: string | null;
  values: PropertyRailValues;
  canWrite: boolean;
}) {
  const t = useTranslations("properties.overview");
  const tForm = useTranslations("properties.form");
  const tDetail = useTranslations("properties.detail");
  const tTypes = useTranslations("properties.types");
  const tConditions = useTranslations("properties.conditions");
  const tStatus = useTranslations("properties.status");
  const [draft, setDraft] = React.useState(values);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setDraft(values);
  }, [values]);

  function save(
    patch: Partial<PropertyFormInput>,
    rollback: PropertyRailValues,
  ) {
    startTransition(async () => {
      const result = await patchProperty(propertyId, patch);
      if (!result.ok) {
        setDraft(rollback);
        toast.error(tDetail("inline_error"));
      }
    });
  }

  function commit(patch: Partial<PropertyFormInput>, next: PropertyRailValues) {
    const previous = draft;
    setDraft(next);
    save(patch, previous);
  }

  const address = [draft.addressLine, draft.district, draft.city, draft.country]
    .filter(Boolean)
    .join(", ");
  const currentIndex = STATUS_ORDER.indexOf(draft.status);
  const rentPerM2 = formatPricePerM2(
    draft.rentAmount,
    draft.areaM2,
    draft.currency,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Icon icon={Image02Icon} size={18} />
            </div>
          )}
        </div>
        <PropertyStatusBadge status={draft.status} className="shrink-0" />
      </div>
      <div className="space-y-2">
        <InlineText
          variant="title"
          canWrite={canWrite}
          disabled={pending}
          value={draft.title}
          ariaLabel={tDetail("edit_field", { label: tForm("title") })}
          className={cn(pageTitleClassName, "min-w-0 px-0 py-px leading-snug")}
          inputClassName="h-auto px-0 py-px font-serif text-xl leading-snug"
          onCommit={(title) => commit({ title }, { ...draft, title })}
        />
        <AddressFields
          canWrite={canWrite}
          disabled={pending}
          display={address}
          line={draft.addressLine}
          district={draft.district}
          city={draft.city}
          country={draft.country}
          fieldLabels={{
            line: tForm("address_line"),
            district: tForm("district"),
            city: tForm("city"),
            country: tForm("country"),
          }}
          onCommit={(next) =>
            commit(
              {
                addressLine: next.line,
                district: next.district,
                city: next.city,
                country: next.country,
              },
              { ...draft, ...next, addressLine: next.line },
            )
          }
        />
      </div>
      <dl className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm">
        <Fact label={t("rent")}>
          <RentField
            canWrite={canWrite}
            disabled={pending}
            amount={draft.rentAmount}
            currency={draft.currency}
            amountAriaLabel={tDetail("edit_field", { label: t("rent") })}
            currencyAriaLabel={tDetail("edit_field", { label: tForm("currency") })}
            onCommitAmount={(rentAmount) =>
              commit({ rentAmount }, { ...draft, rentAmount })
            }
            onCommitCurrency={(currency) =>
              commit({ currency }, { ...draft, currency })
            }
          />
        </Fact>
        <MoneyFact
          label={t("deposit")}
          canWrite={canWrite}
          disabled={pending}
          amount={draft.depositAmount}
          currency={draft.currency}
          ariaLabel={tDetail("edit_field", { label: t("deposit") })}
          onCommit={(depositAmount) =>
            commit({ depositAmount }, { ...draft, depositAmount })
          }
        />
        <MoneyFact
          label={t("dues")}
          canWrite={canWrite}
          disabled={pending}
          amount={draft.duesAmount}
          currency={draft.currency}
          ariaLabel={tDetail("edit_field", { label: t("dues") })}
          onCommit={(duesAmount) =>
            commit({ duesAmount }, { ...draft, duesAmount })
          }
        />
        <Fact label={t("rent_per_m2")}>
          <Readout value={rentPerM2} />
        </Fact>
        <Fact label={t("area")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.areaM2}
            display={
              formatNumber(draft.areaM2)
                ? `${formatNumber(draft.areaM2)} m²`
                : null
            }
            inputMode="decimal"
            ariaLabel={tDetail("edit_field", { label: t("area") })}
            onCommit={(areaM2) => commit({ areaM2 }, { ...draft, areaM2 })}
          />
        </Fact>
        <Fact label={t("rooms")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.rooms}
            ariaLabel={tDetail("edit_field", { label: t("rooms") })}
            onCommit={(rooms) => commit({ rooms }, { ...draft, rooms })}
          />
        </Fact>
        <Fact label={t("bedrooms")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.bedrooms}
            inputMode="numeric"
            ariaLabel={tDetail("edit_field", { label: t("bedrooms") })}
            onCommit={(bedrooms) =>
              commit({ bedrooms }, { ...draft, bedrooms })
            }
          />
        </Fact>
        <Fact label={t("bathrooms")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.bathrooms}
            inputMode="numeric"
            ariaLabel={tDetail("edit_field", { label: t("bathrooms") })}
            onCommit={(bathrooms) =>
              commit({ bathrooms }, { ...draft, bathrooms })
            }
          />
        </Fact>
        <Fact label={t("floor")}>
          <FloorFields
            canWrite={canWrite}
            disabled={pending}
            floor={draft.floor}
            totalFloors={draft.totalFloors}
            ariaLabel={tDetail("edit_field", { label: t("floor") })}
            onCommit={(floor, totalFloors) =>
              commit({ floor, totalFloors }, { ...draft, floor, totalFloors })
            }
          />
        </Fact>
        <Fact label={t("year_built")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.yearBuilt}
            inputMode="numeric"
            ariaLabel={tDetail("edit_field", { label: t("year_built") })}
            onCommit={(yearBuilt) =>
              commit({ yearBuilt }, { ...draft, yearBuilt })
            }
          />
        </Fact>
        <Fact label={t("condition")}>
          <QuietSelect
            canWrite={canWrite}
            disabled={pending}
            value={draft.condition || NONE_CONDITION}
            display={
              draft.condition ? tConditions(draft.condition as "new") : null
            }
            ariaLabel={tDetail("edit_field", { label: t("condition") })}
            options={[
              { value: NONE_CONDITION, label: tConditions("none") },
              ...PROPERTY_CONDITIONS.map((condition) => ({
                value: condition,
                label: tConditions(condition),
              })),
            ]}
            onCommit={(condition) => {
              const next = condition === NONE_CONDITION ? "" : condition;
              commit(
                { condition: next as PropertyFormInput["condition"] },
                { ...draft, condition: next },
              );
            }}
          />
        </Fact>
        <Fact label={t("available_from")}>
          <InlineText
            canWrite={canWrite}
            disabled={pending}
            value={draft.availableFrom}
            type="date"
            ariaLabel={tDetail("edit_field", { label: t("available_from") })}
            onCommit={(availableFrom) =>
              commit({ availableFrom }, { ...draft, availableFrom })
            }
          />
        </Fact>
        <Fact label={t("type")}>
          <QuietSelect
            canWrite={canWrite}
            disabled={pending}
            value={draft.type}
            display={tTypes(draft.type)}
            ariaLabel={tDetail("edit_field", { label: t("type") })}
            options={PROPERTY_TYPES.map((type) => ({
              value: type,
              label: tTypes(type),
            }))}
            onCommit={(type) =>
              commit(
                { type: type as PropertyType },
                {
                  ...draft,
                  type: type as PropertyType,
                },
              )
            }
          />
        </Fact>
        <Fact label={t("timezone")}>
          {canWrite ? (
            <TimezoneSelect
              value={draft.timezone}
              onValueChange={(timezone) =>
                commit({ timezone }, { ...draft, timezone })
              }
              className={quietControl}
            />
          ) : (
            <Readout value={draft.timezone} />
          )}
        </Fact>
      </dl>
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground">{t("lifecycle")}</p>
        <ol className="mt-2 space-y-1.5">
          {STATUS_ORDER.map((status, i) => (
            <li
              key={status}
              className={cn(
                "flex items-center gap-2 text-sm",
                i === currentIndex
                  ? "font-medium text-foreground"
                  : i < currentIndex
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  i === currentIndex
                    ? "bg-brand"
                    : i < currentIndex
                      ? "bg-foreground/40"
                      : "bg-border",
                )}
              />
              {tStatus(status)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="flex h-8 items-center text-muted-foreground">{label}</dt>
      <dd className="flex h-8 min-w-0 items-center">{children}</dd>
    </>
  );
}

function Readout({ value }: { value: string | null }) {
  return (
    <span className="block h-8 truncate px-1.5 leading-8 font-medium tabular-nums">
      {value}
    </span>
  );
}

const compactCurrencyControl =
  "h-8 w-auto max-w-[5.5rem] shrink-0 border-transparent bg-transparent px-1.5 font-medium tabular-nums shadow-none hover:bg-muted focus-visible:border-ring focus-visible:bg-card";

function RentField({
  canWrite,
  disabled,
  amount,
  currency,
  amountAriaLabel,
  currencyAriaLabel,
  onCommitAmount,
  onCommitCurrency,
}: {
  canWrite: boolean;
  disabled: boolean;
  amount: string;
  currency: string;
  amountAriaLabel: string;
  currencyAriaLabel: string;
  onCommitAmount: (value: string) => void;
  onCommitCurrency: (value: string) => void;
}) {
  const readout = formatMoney(amount, currency);
  const amountDisplay = formatNumber(amount);
  if (!canWrite) {
    return <Readout value={readout} />;
  }
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <InlineText
        canWrite
        disabled={disabled}
        value={amount}
        display={amountDisplay}
        inputMode="decimal"
        ariaLabel={amountAriaLabel}
        className="min-w-0 flex-1 px-1.5"
        inputClassName={quietControl}
        onCommit={onCommitAmount}
      />
      <CurrencySelect
        id="property-rail-currency"
        value={currency}
        disabled={disabled}
        ariaLabel={currencyAriaLabel}
        onValueChange={onCommitCurrency}
        className={compactCurrencyControl}
      />
    </div>
  );
}

function MoneyFact({
  label,
  amount,
  currency,
  canWrite,
  disabled,
  ariaLabel,
  onCommit,
}: {
  label: string;
  amount: string;
  currency: string;
  canWrite: boolean;
  disabled: boolean;
  ariaLabel: string;
  onCommit: (value: string) => void;
}) {
  return (
    <Fact label={label}>
      <InlineText
        canWrite={canWrite}
        disabled={disabled}
        value={amount}
        display={formatMoney(amount, currency)}
        inputMode="decimal"
        ariaLabel={ariaLabel}
        onCommit={onCommit}
      />
    </Fact>
  );
}

function InlineText({
  value,
  display,
  canWrite,
  disabled,
  ariaLabel,
  placeholder,
  className,
  inputClassName,
  multiline,
  variant = "default",
  type = "text",
  inputMode,
  onCommit,
}: {
  value: string;
  display?: string | null;
  canWrite: boolean;
  disabled: boolean;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  variant?: "default" | "title";
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(value);
  const committed = React.useRef(value);
  React.useEffect(() => {
    committed.current = value;
    setText(value);
  }, [value]);

  function finish(next: string) {
    setEditing(false);
    if (next === committed.current) return;
    committed.current = next;
    onCommit(next);
  }

  const shown = display === undefined ? value : display;
  if (!canWrite || !editing) {
    const body = shown || (
      <span className="sr-only">{placeholder ?? ariaLabel}</span>
    );
    const readOnlyClass =
      variant === "title"
        ? "block w-full min-w-0 truncate"
        : "block truncate px-1.5";
    if (!canWrite) {
      return <span className={cn(readOnlyClass, className)}>{body}</span>;
    }
    const buttonClass =
      variant === "title"
        ? "block w-full min-w-0 truncate rounded-md text-left transition-colors hover:bg-muted disabled:opacity-50"
        : cn(
            "flex h-8 w-full items-center truncate rounded-md px-1.5 text-left font-medium transition-colors hover:bg-muted disabled:opacity-50",
            multiline && "h-auto min-h-8 py-1 font-normal whitespace-normal",
          );
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        className={cn(buttonClass, className)}
      >
        {body}
      </button>
    );
  }

  if (multiline) {
    return (
      <Textarea
        autoFocus
        value={text}
        aria-label={ariaLabel}
        rows={4}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => finish(text)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        className="min-h-20 text-sm"
      />
    );
  }

  return (
    <Input
      autoFocus
      size="sm"
      type={type}
      inputMode={inputMode}
      value={text}
      aria-label={ariaLabel}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => finish(text)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(event.currentTarget.value);
        }
        if (event.key === "Escape") {
          setText(committed.current);
          setEditing(false);
        }
      }}
      className={cn(quietControl, inputClassName)}
    />
  );
}

function AddressFields({
  canWrite,
  disabled,
  display,
  line,
  district,
  city,
  country,
  fieldLabels,
  onCommit,
}: {
  canWrite: boolean;
  disabled: boolean;
  display: string;
  line: string;
  district: string;
  city: string;
  country: string;
  fieldLabels: {
    line: string;
    district: string;
    city: string;
    country: string;
  };
  onCommit: (next: {
    line: string;
    district: string;
    city: string;
    country: string;
  }) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [next, setNext] = React.useState({ line, district, city, country });
  React.useEffect(() => {
    setNext({ line, district, city, country });
  }, [line, district, city, country]);

  const locationIcon = (
    <Icon icon={Location01Icon} size={16} className="mt-0.5 shrink-0" />
  );

  if (!canWrite || !editing) {
    const body = display || <span className="sr-only">{fieldLabels.line}</span>;
    if (!canWrite) {
      return (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          {locationIcon}
          <span className="min-w-0 flex-1 pt-0.5">{body}</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={fieldLabels.line}
        onClick={() => setEditing(true)}
        className="flex w-full min-w-0 items-start gap-1.5 rounded-md py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {locationIcon}
        <span className="min-w-0 flex-1">{body}</span>
      </button>
    );
  }

  function finish() {
    setEditing(false);
    if (
      next.line !== line ||
      next.district !== district ||
      next.city !== city ||
      next.country !== country
    ) {
      onCommit(next);
    }
  }

  return (
    <div className="flex w-full min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
      <Icon icon={Location01Icon} size={16} className="mt-2 shrink-0" />
      <div
        className="grid min-w-0 flex-1 gap-1.5"
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          finish();
        }}
      >
      {(
        [
          ["line", fieldLabels.line],
          ["district", fieldLabels.district],
          ["city", fieldLabels.city],
          ["country", fieldLabels.country],
        ] as const
      ).map(([key, label]) => (
        <Input
          key={key}
          autoFocus={key === "line"}
          size="sm"
          aria-label={label}
          placeholder={label}
          value={next[key]}
          onChange={(event) =>
            setNext((current) => ({ ...current, [key]: event.target.value }))
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setNext({ line, district, city, country });
              setEditing(false);
            }
          }}
        />
      ))}
      </div>
    </div>
  );
}

function FloorFields({
  canWrite,
  disabled,
  floor,
  totalFloors,
  ariaLabel,
  onCommit,
}: {
  canWrite: boolean;
  disabled: boolean;
  floor: string;
  totalFloors: string;
  ariaLabel: string;
  onCommit: (floor: string, totalFloors: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [nextFloor, setNextFloor] = React.useState(floor);
  const [nextTotal, setNextTotal] = React.useState(totalFloors);
  React.useEffect(() => {
    setNextFloor(floor);
    setNextTotal(totalFloors);
  }, [floor, totalFloors]);

  const display = formatFloor(
    floor === "" ? null : Number(floor),
    totalFloors === "" ? null : Number(totalFloors),
  );

  if (!canWrite || !editing) {
    if (!canWrite) return <Readout value={display} />;
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        className="flex h-8 w-full items-center truncate rounded-md px-1.5 text-left font-medium tabular-nums transition-colors hover:bg-muted"
      >
        {display}
      </button>
    );
  }

  function finish() {
    setEditing(false);
    if (nextFloor !== floor || nextTotal !== totalFloors) {
      onCommit(nextFloor, nextTotal);
    }
  }

  return (
    <div
      className="flex items-center gap-1"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        finish();
      }}
    >
      <Input
        autoFocus
        size="sm"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={nextFloor}
        onChange={(event) => setNextFloor(event.target.value)}
        className={quietControl}
      />
      <span className="text-muted-foreground">/</span>
      <Input
        size="sm"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={nextTotal}
        onChange={(event) => setNextTotal(event.target.value)}
        className={quietControl}
      />
    </div>
  );
}

function QuietSelect({
  canWrite,
  disabled,
  value,
  display,
  ariaLabel,
  options,
  onCommit,
}: {
  canWrite: boolean;
  disabled: boolean;
  value: string;
  display: string | null;
  ariaLabel: string;
  options: { value: string; label: string }[];
  onCommit: (value: string) => void;
}) {
  if (!canWrite) return <Readout value={display} />;
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== value) onCommit(next);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(quietControl, "font-medium")}
      >
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
