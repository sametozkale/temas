"use client";

import { useTranslations } from "next-intl";

import {
  ApartmentIcon,
  Building03Icon,
  House01Icon,
  Icon,
  MapsIcon,
  Store01Icon,
  Tag01Icon,
  WarehouseIcon,
  type IconSvgElement,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatus, PropertyType } from "@/lib/db/schema";
import { STATUS_TONE } from "@/lib/properties/status";

/** Property type → Hugeicon (docs/01 §5). */
export const PROPERTY_TYPE_ICONS: Record<PropertyType, IconSvgElement> = {
  apartment: ApartmentIcon,
  house: House01Icon,
  office: Building03Icon,
  shop: Store01Icon,
  warehouse: WarehouseIcon,
  land: MapsIcon,
  other: Tag01Icon,
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
    <span className={className}>
      <Icon
        icon={PROPERTY_TYPE_ICONS[type]}
        size={16}
        className="mr-1 inline-block align-[-2px] text-muted-foreground"
      />
      {t(type)}
    </span>
  );
}
