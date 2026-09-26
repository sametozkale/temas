"use client";

import { useTranslations } from "next-intl";

import { Icon } from "@/components/icons";
import { PROPERTY_TYPE_ICONS } from "@/components/properties/type-icons";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatus, PropertyType } from "@/lib/db/schema";
import { STATUS_TONE } from "@/lib/properties/status";
import { cn } from "@/lib/utils";

export { PROPERTY_TYPE_ICONS };

export function PropertyStatusDot({
  status,
  className,
}: {
  status: PropertyStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status], className)}
    />
  );
}

const STATUS_DOT: Record<PropertyStatus, string> = {
  draft: "bg-muted-foreground/45",
  active: "bg-brand",
  viewing_in_progress: "bg-info",
  application_review: "bg-info",
  contract_pending: "bg-warning",
  rented: "bg-success",
  archived: "bg-muted-foreground/35",
};

export function PropertyStatusBadge({
  status,
  className,
}: {
  status: PropertyStatus;
  className?: string;
}) {
  const t = useTranslations("properties.status");
  return (
    <Badge variant={STATUS_TONE[status]} className={className}>
      {t(status)}
    </Badge>
  );
}

export function PropertyTypeLabel({
  type,
  className,
}: {
  type: PropertyType;
  className?: string;
}) {
  const t = useTranslations("properties.types");
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Icon
        icon={PROPERTY_TYPE_ICONS[type]}
        size={16}
        className="shrink-0 text-muted-foreground"
      />
      <span className="truncate">{t(type)}</span>
    </span>
  );
}
