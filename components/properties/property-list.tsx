import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Icon, Image02Icon } from "@/components/icons";
import {
  PropertyStatusBadge,
  PropertyTypeLabel,
} from "@/components/properties/property-badges";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PropertyStatus, PropertyType } from "@/lib/db/schema";
import {
  formatAddress,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/lib/format";

export type PropertyListItem = {
  id: string;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  address: Parameters<typeof formatAddress>[0];
  rentAmount: string | null;
  currency: string;
  areaM2: string | null;
  rooms: string | null;
  updatedAt: Date;
  coverUrl: string | null;
  assignedAgentName?: string | null;
};

function Cover({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
        <img
          src={url}
          alt={title}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Icon icon={Image02Icon} size={20} />
        </div>
      )}
    </div>
  );
}

export async function PropertyGrid({ items }: { items: PropertyListItem[] }) {
  const t = await getTranslations("properties");
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => {
        const rent = formatMoney(p.rentAmount, p.currency);
        const area = formatNumber(p.areaM2);
        return (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`} className="group block h-full">
              <Card className="h-full gap-0 overflow-hidden py-0 transition-colors group-hover:border-foreground/20">
                <div className="relative">
                  <Cover url={p.coverUrl} title={p.title} />
                  <PropertyStatusBadge
                    status={p.status}
                    className="absolute top-2.5 right-2.5"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                    {p.title}
                  </h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {formatAddress(p.address, { short: true }) ??
                      t("no_address")}
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs leading-none text-muted-foreground">
                    <PropertyTypeLabel
                      type={p.type}
                      className="min-w-0 shrink"
                    />
                    {p.rooms ? (
                      <>
                        <span aria-hidden className="shrink-0">·</span>
                        <span className="shrink-0 tabular-nums">{p.rooms}</span>
                      </>
                    ) : null}
                    {area ? (
                      <>
                        <span aria-hidden className="shrink-0">·</span>
                        <span className="shrink-0 tabular-nums">{area} m²</span>
                      </>
                    ) : null}
                  </p>
                  <div className="mt-auto flex items-baseline justify-between gap-3 pt-1.5">
                    <p className="text-sm font-medium tabular-nums">
                      {rent ?? (
                        <span className="font-normal text-muted-foreground">
                          {t("no_rent")}
                        </span>
                      )}
                    </p>
                    {p.assignedAgentName ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.assignedAgentName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export async function PropertyTable({ items }: { items: PropertyListItem[] }) {
  const t = await getTranslations("properties");
  return (
    <Card className="gap-0 overflow-x-auto py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("col_property")}</TableHead>
            <TableHead>{t("col_type")}</TableHead>
            <TableHead>{t("col_status")}</TableHead>
            <TableHead>{t("col_agent")}</TableHead>
            <TableHead className="text-right">{t("col_rent")}</TableHead>
            <TableHead className="text-right">{t("col_updated")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/properties/${p.id}`}
                  className="flex items-center gap-3"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {p.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL
                      <img
                        src={p.coverUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {p.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatAddress(p.address, { short: true }) ??
                        t("no_address")}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <PropertyTypeLabel type={p.type} />
              </TableCell>
              <TableCell>
                <PropertyStatusBadge status={p.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.assignedAgentName ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(p.rentAmount, p.currency) ?? t("no_rent")}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatRelative(p.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
