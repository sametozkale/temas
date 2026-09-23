"use client";

import { useTranslations } from "next-intl";

import { Icon } from "@/components/icons";
import { PROPERTY_TYPE_ICONS } from "@/components/properties/type-icons";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatus, PropertyType } from "@/lib/db/schema";
import { STATUS_TONE } from "@/lib/properties/status";
import { cn } from "@/lib/utils";

export { PROPERTY_TYPE_ICONS };

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
        size={14}
        className="shrink-0 text-muted-foreground"
      />
      <span className="truncate">{t(type)}</span>
    </span>
  );
}
