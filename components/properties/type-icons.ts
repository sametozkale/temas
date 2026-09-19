import {
  ApartmentIcon,
  Building03Icon,
  House01Icon,
  MapsIcon,
  Store01Icon,
  Tag01Icon,
  WarehouseIcon,
  type IconSvgElement,
} from "@/components/icons";
import type { PropertyType } from "@/lib/db/schema";

/** Property type → Hugeicon (docs/01 §5). Safe to import from Server Components. */
export const PROPERTY_TYPE_ICONS: Record<PropertyType, IconSvgElement> = {
  apartment: ApartmentIcon,
  house: House01Icon,
  office: Building03Icon,
  shop: Store01Icon,
  warehouse: WarehouseIcon,
  land: MapsIcon,
  other: Tag01Icon,
};
