"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HierarchyIcon, Icon, LayoutLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function PropertyViewSwitch({
  propertyId,
  mapLabel,
  detailLabel,
}: {
  propertyId: string;
  mapLabel: string;
  detailLabel: string;
}) {
  const pathname = usePathname();
  const onMap = pathname === `/properties/${propertyId}/map`;

  return (
    <Button variant="outline" size="sm" className="bg-card" asChild>
      <Link
        href={
          onMap
            ? `/properties/${propertyId}/overview`
            : `/properties/${propertyId}/map`
        }
      >
        <Icon
          icon={onMap ? LayoutLeftIcon : HierarchyIcon}
          size={16}
          data-icon="inline-start"
        />
        {onMap ? detailLabel : mapLabel}
      </Link>
    </Button>
  );
}
