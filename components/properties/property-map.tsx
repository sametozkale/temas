import Link from "next/link";

import { PersonAvatar } from "@/components/identity-marks";
import {
  House01Icon,
  Icon,
  Location01Icon,
  UserIcon,
  type IconSvgElement,
} from "@/components/icons";
import { PROPERTY_TYPE_ICONS } from "@/components/properties/type-icons";
import { initialsOf } from "@/lib/auth-utils";
import type { PropertyType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type MapPerson = {
  id: string;
  name: string;
  subtitle: string | null;
  href?: string;
  imageUrl?: string | null;
};

export type MapProperty = {
  id: string;
  title: string;
  type: PropertyType;
  address: string | null;
  href: string;
};

export type MapHouseholdMember = {
  name: string;
  unnamed?: boolean;
};

export type MapHousehold = {
  id: string;
  href: string;
  title: string;
  members: MapHouseholdMember[];
  subtitle: string | null;
};

export type MapStage = {
  id: string;
  name: string;
  households: MapHousehold[];
};

export type MapLabels = {
  property: string;
  agent: string;
  owner: string;
  tenant: string;
  applicants: string;
  empty_agent: string;
  empty_owner: string;
  empty_tenant: string;
};

export function PropertyMap({
  property,
  agent,
  owners,
  tenants,
  stages,
  labels,
}: {
  property: MapProperty;
  agent: MapPerson | null;
  owners: MapPerson[];
  tenants: MapPerson[];
  stages: MapStage[];
  labels: MapLabels;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
      <div
        className={cn(
          "grid w-full max-w-full items-center justify-items-center md:w-max",
          "grid-cols-2",
          "[grid-template-areas:'owner_owner'_'top_top'_'hub_hub'_'agent_tenant']",
          "md:grid-cols-[auto_auto_auto]",
          "md:[grid-template-areas:'._owner_.'_'._top_.'_'agent_hub_tenant']",
        )}
      >
        <div className="[grid-area:owner]">
          <PersonStack
            people={owners}
            emptyLabel={labels.empty_owner}
            kicker={labels.owner}
            emptyHref={`/properties/${property.id}/people`}
          />
        </div>
        <Stem axis="y" className="[grid-area:top]" />
        <div className="flex items-center [grid-area:agent]">
          <PersonStack
            people={agent ? [agent] : []}
            emptyLabel={labels.empty_agent}
            kicker={labels.agent}
          />
          <Stem axis="x" className="hidden md:block" />
        </div>
        <div className="[grid-area:hub]">
          <PropertyNode property={property} kicker={labels.property} />
        </div>
        <div className="flex items-center [grid-area:tenant]">
          <Stem axis="x" className="hidden md:block" />
          <PersonStack
            people={tenants}
            emptyLabel={labels.empty_tenant}
            kicker={labels.tenant}
            emptyHref={`/properties/${property.id}/people`}
          />
        </div>
      </div>
      <Stem axis="y" />
      <PipelineBoard
        stages={stages}
        href={`/properties/${property.id}/applications`}
        kicker={labels.applicants}
      />
    </div>
  );
}

function PersonStack({
  people,
  emptyLabel,
  kicker,
  emptyHref,
}: {
  people: MapPerson[];
  emptyLabel: string;
  kicker: string;
  emptyHref?: string;
}) {
  if (people.length === 0) {
    return (
      <WireCard href={emptyHref} kicker={kicker} title={emptyLabel} empty />
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      {people.map((person) => (
        <WireCard
          key={person.id}
          href={person.href}
          kicker={kicker}
          title={person.name}
          subtitle={person.subtitle}
          avatar={{ name: person.name, src: person.imageUrl }}
        />
      ))}
    </div>
  );
}

function PropertyNode({
  property,
  kicker,
}: {
  property: MapProperty;
  kicker: string;
}) {
  return (
    <WireCard
      href={property.href}
      kicker={kicker}
      title={property.title}
      subtitle={property.address}
      icon={PROPERTY_TYPE_ICONS[property.type] ?? House01Icon}
      featured
    />
  );
}

function PipelineBoard({
  stages,
  href,
  kicker,
}: {
  stages: MapStage[];
  href: string;
  kicker: string;
}) {
  if (stages.length === 0) return null;
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-3">
      <Link
        href={href}
        className="text-[11px] tracking-[0.12em] text-muted-foreground/70 uppercase transition-colors hover:text-foreground"
      >
        {kicker}
      </Link>
      <div className="w-full overflow-x-auto">
        <div className="mx-auto flex w-max gap-2 px-1 pb-1">
          {stages.map((stage) => (
            <div key={stage.id} className="flex w-32 shrink-0 flex-col gap-2">
              <p className="line-clamp-2 min-h-8 text-center text-[11px] tracking-[0.12em] text-muted-foreground/70 uppercase">
                {stage.name}
              </p>
              <div className="flex min-h-28 flex-col gap-2 rounded-lg border border-dashed border-foreground/20 p-2">
                {stage.households.map((household) => (
                  <FamilyCard key={household.id} household={household} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyCard({ household }: { household: MapHousehold }) {
  const shown = household.members.slice(0, 3);
  const extra = household.members.length - shown.length;
  return (
    <Link
      href={household.href}
      className="rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-foreground/25 bg-card/80 p-2 text-left transition-colors hover:border-foreground/40">
        <div className="flex items-center">
          <div className="flex -space-x-1.5">
            {shown.map((member, index) =>
              member.unnamed ? (
                <span
                  key={`u-${index}`}
                  className="relative inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted ring-1 ring-background"
                >
                  <Icon
                    icon={UserIcon}
                    size={16}
                    className="size-3 text-muted-foreground/70"
                  />
                </span>
              ) : (
                <PersonAvatar
                  key={`${member.name}-${index}`}
                  initials={initialsOf(member.name)}
                  className="size-6 text-[9px] ring-1 ring-background"
                />
              ),
            )}
            {extra > 0 ? (
              <span className="relative inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground ring-1 ring-background">
                +{extra}
              </span>
            ) : null}
          </div>
        </div>
        <p className="line-clamp-2 text-sm leading-4 font-medium">
          {household.title}
        </p>
        {household.subtitle ? (
          <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
            {household.subtitle}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function WireCard({
  href,
  kicker,
  title,
  subtitle,
  avatar,
  icon,
  featured,
  empty,
}: {
  href?: string;
  kicker: string;
  title: string;
  subtitle?: string | null;
  avatar?: { name: string; src?: string | null };
  icon?: IconSvgElement;
  featured?: boolean;
  empty?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3 text-left transition-colors",
        featured ? "w-44" : "w-full max-w-40",
        featured
          ? "border border-foreground/15 bg-card"
          : empty
            ? "border border-dashed border-foreground/20 bg-transparent"
            : "border border-dashed border-foreground/25 bg-card/80",
        href ? "hover:border-foreground/40" : null,
      )}
    >
      <p className="text-[11px] tracking-[0.12em] text-muted-foreground/70 uppercase">
        {kicker}
      </p>
      <div className="flex min-w-0 items-start gap-2">
        {avatar ? (
          <PersonAvatar
            src={avatar.src}
            initials={initialsOf(avatar.name)}
            className="size-7 shrink-0 text-[10px]"
          />
        ) : (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
              featured ? "bg-secondary" : "bg-muted/60",
            )}
          >
            <Icon icon={icon ?? UserIcon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "line-clamp-2 leading-5",
              featured
                ? "font-serif text-sm font-medium tracking-tight"
                : empty
                  ? "text-sm text-muted-foreground"
                  : "text-sm font-medium",
            )}
          >
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
              {featured ? (
                <Icon
                  icon={Location01Icon}
                  size={16}
                  className="mt-px size-3.5 shrink-0"
                />
              ) : null}
              <span className="line-clamp-2">{subtitle}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link
      href={href}
      className="rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  );
}

function Stem({ axis, className }: { axis: "x" | "y"; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "shrink-0 border-dashed border-foreground/25",
        axis === "y" ? "h-8 w-px border-l" : "h-px w-8 border-t lg:w-10",
        className,
      )}
    />
  );
}
