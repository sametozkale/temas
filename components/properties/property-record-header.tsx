import { Icon, Image02Icon, Location01Icon } from "@/components/icons";
import { pageTitleClassName } from "@/components/page-header";
import {
  PropertyStatusBadge,
  PropertyTypeLabel,
} from "@/components/properties/property-badges";
import {
  formatAddress,
  formatFloor,
  formatMoney,
  formatNumber,
} from "@/lib/format";
import type { PropertyRow } from "@/lib/properties/queries";

export function PropertyRecordHeader({
  property,
  coverUrl,
  labels,
}: {
  property: PropertyRow;
  coverUrl: string | null;
  labels: {
    perMonth: string;
    floor: string;
  };
}) {
  const rent = formatMoney(property.rentAmount, property.currency);
  const address = formatAddress(property.address);
  const area = formatNumber(property.areaM2);
  const floor = formatFloor(property.floor, property.totalFloors);
  const facts = [
    property.rooms,
    area ? `${area} m²` : null,
    floor ? `${labels.floor} ${floor}` : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <header className="flex min-w-0 items-start gap-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-[5.5rem]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Icon icon={Image02Icon} size={20} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={pageTitleClassName}>{property.title}</h1>
            <PropertyStatusBadge status={property.status} />
          </div>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <PropertyTypeLabel type={property.type} />
            {facts.map((fact) => (
              <span key={fact} className="inline-flex items-center gap-2">
                <span aria-hidden className="text-border">
                  ·
                </span>
                {fact}
              </span>
            ))}
          </p>
          {address ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Icon icon={Location01Icon} size={16} />
              <span className="truncate">{address}</span>
            </p>
          ) : null}
        </div>
        {rent ? (
          <p className="shrink-0 font-serif text-xl font-medium tracking-tight tabular-nums sm:text-right">
            {rent}
            <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">
              {labels.perMonth}
            </span>
          </p>
        ) : null}
      </div>
    </header>
  );
}
