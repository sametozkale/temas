"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowDown01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CreateContractControl({
  propertyId,
  households,
}: {
  propertyId: string;
  households: { id: string; label: string; stage: string | null }[];
}) {
  const t = useTranslations("pipeline");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={households.length === 0}>
          {t("create_contract")}
          <Icon icon={ArrowDown01Icon} size={16} data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("contract_party")}</DropdownMenuLabel>
        {households.map((row) => (
          <DropdownMenuItem key={row.id} asChild>
            <Link
              href={`/properties/${propertyId}/contracts/new?applicationId=${row.id}`}
            >
              {row.stage ? `${row.label} · ${row.stage}` : row.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
