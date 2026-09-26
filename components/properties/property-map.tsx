"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/identity-marks";
import {
  Briefcase01Icon,
  Copy01Icon,
  FitToScreenIcon,
  Home01Icon,
  House01Icon,
  Icon,
  Key01Icon,
  Link01Icon,
  Location01Icon,
  MoreHorizontalIcon,
  Tick02Icon,
  UserIcon,
  ZoomInIcon,
  ZoomOutIcon,
  type IconSvgElement,
} from "@/components/icons";
import {
  MAP_CANVAS_CLASS,
  MAP_DOT_STYLE,
  MAP_LINK_OWNER,
  MAP_LINK_X,
  MAP_LINK_Y,
  MAP_PARTY_WIDTH,
  MAP_PROPERTY_WIDTH,
  MAP_STAGE_WIDTH,
} from "@/components/properties/map-layout";
import { PROPERTY_TYPE_ICONS } from "@/components/properties/type-icons";
import { ApplicantSheet } from "@/components/pipeline/applicant-sheet";
import { stageToneDot } from "@/components/pipeline/stage-tone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  imageUrl?: string | null;
};

export type MapHousehold = {
  id: string;
  href: string;
  title: string;
  members: MapHouseholdMember[];
  subtitle: string | null;
  score: number | null;
};

export type MapStage = {
  id: string;
  name: string;
  color: string | null;
  households: MapHousehold[];
};

/** A link the agent can hand out. `url` is null while it is not live. */
export type MapShare = { url: string | null; hint: string };

export type MapShares = {
  ownerReview: MapShare;
  ownerInvite: MapShare;
  tenantInvite: MapShare;
  form: MapShare;
  booking: MapShare;
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
  owner_review: string;
  owner_invite: string;
  tenant_invite: string;
  form: string;
  booking: string;
  applicant_links: string;
  owner_links: string;
  tenant_links: string;
  copied: string;
  zoom_in: string;
  zoom_out: string;
  zoom_reset: string;
  fit: string;
  canvas_hint: string;
};

export function PropertyMap({
  property,
  agent,
  owners,
  tenants,
  stages,
  shares,
  labels,
}: {
  property: MapProperty;
  agent: MapPerson | null;
  owners: MapPerson[];
  tenants: MapPerson[];
  stages: MapStage[];
  shares: MapShares;
  labels: MapLabels;
}) {
  const [applicationId, setApplicationId] = React.useState<string | null>(null);
  const peopleHref = `/properties/${property.id}/people`;

  return (
    <>
      <MapCanvas labels={labels}>
        <div className="flex flex-col items-center">
          <PartyStack
            role="owner"
            people={owners}
            label={labels.owner}
            emptyLabel={labels.empty_owner}
            emptyHref={peopleHref}
          />
          <Connector axis="y" length={MAP_LINK_OWNER}>
            <ShareMenu
              label={labels.owner_links}
              items={[
                { label: labels.owner_review, share: shares.ownerReview },
                { label: labels.owner_invite, share: shares.ownerInvite },
              ]}
              copied={labels.copied}
            />
          </Connector>
          <div className="flex items-center">
            <PartyStack
              role="agent"
              people={agent ? [agent] : []}
              label={labels.agent}
              emptyLabel={labels.empty_agent}
            />
            <Connector axis="x" />
            <PropertyNode property={property} label={labels.property} />
            <Connector axis="x">
              <ShareMenu
                label={labels.tenant_links}
                items={[
                  { label: labels.tenant_invite, share: shares.tenantInvite },
                ]}
                copied={labels.copied}
              />
            </Connector>
            <PartyStack
              role="tenant"
              people={tenants}
              label={labels.tenant}
              emptyLabel={labels.empty_tenant}
              emptyHref={peopleHref}
            />
          </div>
          <Connector axis="y">
            <ShareMenu
              label={labels.applicant_links}
              items={[
                { label: labels.form, share: shares.form },
                { label: labels.booking, share: shares.booking },
              ]}
              copied={labels.copied}
            />
          </Connector>
          <PipelineTree
            stages={stages}
            href={`/properties/${property.id}/pipeline`}
            kicker={labels.applicants}
            onOpen={setApplicationId}
          />
        </div>
      </MapCanvas>
      <ApplicantSheet
        propertyId={property.id}
        applicationId={applicationId}
        open={Boolean(applicationId)}
        onOpenChange={(open) => {
          if (!open) setApplicationId(null);
        }}
      />
    </>
  );
}

type View = { x: number; y: number; scale: number };

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;
const EDGE = 24;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Pannable, zoomable dotted board. Cards, links and chips keep their clicks. */
function MapCanvas({
  labels,
  children,
}: {
  labels: MapLabels;
  children: React.ReactNode;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState<View>({ x: 0, y: 0, scale: 1 });
  const [ready, setReady] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [easing, setEasing] = React.useState(false);
  const viewRef = React.useRef(view);
  const touchedRef = React.useRef(false);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  const apply = React.useCallback((next: View, ease = false) => {
    viewRef.current = next;
    setEasing(ease);
    setView(next);
  }, []);

  const place = React.useCallback(
    (mode: "width" | "all", ease = false) => {
      const frame = frameRef.current;
      const content = contentRef.current;
      if (!frame || !content) return;
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      const cw = content.offsetWidth;
      const ch = content.offsetHeight;
      if (!fw || !cw) return;
      const byWidth = (fw - EDGE * 2) / cw;
      const byHeight = (fh - EDGE * 2) / ch;
      const scale = clampScale(
        Math.min(1, mode === "all" ? Math.min(byWidth, byHeight) : byWidth),
      );
      const x = (fw - cw * scale) / 2;
      const y = Math.max(EDGE, (fh - ch * scale) / 2);
      apply({ x, y, scale }, ease);
    },
    [apply],
  );

  React.useLayoutEffect(() => {
    place("width");
    setReady(true);
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      if (!touchedRef.current) place("width");
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [place]);

  const zoomAt = React.useCallback(
    (factor: number, px: number, py: number, ease = false) => {
      const current = viewRef.current;
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      touchedRef.current = true;
      apply(
        {
          scale,
          x: px - (px - current.x) * ratio,
          y: py - (py - current.y) * ratio,
        },
        ease,
      );
    },
    [apply],
  );

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        const delta = Math.max(-20, Math.min(20, event.deltaY));
        zoomAt(
          Math.exp(-delta * 0.01),
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        return;
      }
      const current = viewRef.current;
      touchedRef.current = true;
      apply({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [apply, zoomAt]);

  const zoomCenter = (factor: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    zoomAt(factor, frame.clientWidth / 2, frame.clientHeight / 2, true);
  };

  const dotSize = 16 * view.scale;

  return (
    <div
      ref={frameRef}
      className={cn(
        MAP_CANVAS_CLASS,
        "touch-none select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        ...MAP_DOT_STYLE,
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("a, button, [data-map-control]")) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: viewRef.current.x,
          y: viewRef.current.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        touchedRef.current = true;
        apply({
          ...viewRef.current,
          x: drag.x + event.clientX - drag.startX,
          y: drag.y + event.clientY - drag.startY,
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
    >
      <div
        ref={contentRef}
        className={cn(
          "absolute top-0 left-0 w-max origin-top-left px-4 pt-10 pb-4",
          easing && "transition-transform duration-200 ease-out",
          !ready && "invisible",
        )}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3">
        <div
          data-map-control
          className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
        >
          <ToolbarButton
            label={labels.zoom_out}
            icon={ZoomOutIcon}
            onClick={() => zoomCenter(1 / 1.2)}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={labels.zoom_reset}
                className="h-7 w-12 rounded-md text-xs text-muted-foreground tabular-nums transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => zoomCenter(1 / viewRef.current.scale)}
              >
                {Math.round(view.scale * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{labels.zoom_reset}</TooltipContent>
          </Tooltip>
          <ToolbarButton
            label={labels.zoom_in}
            icon={ZoomInIcon}
            onClick={() => zoomCenter(1.2)}
          />
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
          <ToolbarButton
            label={labels.fit}
            icon={FitToScreenIcon}
            onClick={() => {
              touchedRef.current = true;
              place("all", true);
            }}
          />
        </div>
        <p className="hidden rounded-md bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm sm:block">
          {labels.canvas_hint}
        </p>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: IconSvgElement;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onClick}
        >
          <Icon icon={icon} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function copyLink(url: string, copied: string, onCopied?: () => void) {
  void navigator.clipboard.writeText(url).then(
    () => {
      onCopied?.();
      toast.success(copied);
    },
    () => toast.success(copied, { description: url }),
  );
}

/** One chip for several links on the same line; each link is a menu row. */
function ShareMenu({
  label,
  items,
  copied,
}: {
  label: string;
  items: { label: string; share: MapShare }[];
  copied: string;
}) {
  const [done, setDone] = React.useState(false);
  const live = items.some((item) => item.share.url);

  React.useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 1600);
    return () => window.clearTimeout(timer);
  }, [done]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border pr-2 pl-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-muted",
            live
              ? "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:bg-muted"
              : "border-dashed border-foreground/20 bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon
            icon={done ? Tick02Icon : live ? Copy01Icon : Link01Icon}
            size={16}
            className="size-3.5 shrink-0"
          />
          {label}
          <Icon
            icon={MoreHorizontalIcon}
            size={16}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-72">
        {items.map((item) => {
          const url = item.share.url;
          return (
            <DropdownMenuItem
              key={item.label}
              disabled={!url}
              className="items-start gap-2 py-1.5 data-disabled:opacity-100"
              onSelect={() => {
                if (url) copyLink(url, copied, () => setDone(true));
              }}
            >
              <Icon
                icon={url ? Copy01Icon : Link01Icon}
                size={16}
                className={cn(
                  "mt-0.5",
                  url ? "text-muted-foreground" : "text-muted-foreground/50",
                )}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    !url && "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.share.hint}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Dashed link between two nodes; a share chip sits on its midpoint. */
function Connector({
  axis,
  length,
  children,
}: {
  axis: "x" | "y";
  length?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        axis === "y"
          ? cn(length ?? MAP_LINK_Y, "w-px")
          : cn(length ?? MAP_LINK_X, "h-px"),
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute border-dashed border-foreground/25",
          axis === "y"
            ? "inset-y-0 left-0 border-l"
            : "inset-x-0 top-0 border-t",
        )}
      />
      {children ? (
        <div className="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type MapRole = "owner" | "agent" | "property" | "tenant";

const ROLE_TAGS: Record<MapRole, { icon: IconSvgElement; tone: string }> = {
  owner: {
    icon: Key01Icon,
    tone: "border-warning/20 bg-warning-soft text-warning-foreground",
  },
  agent: {
    icon: Briefcase01Icon,
    tone: "border-info/20 bg-info-soft text-info-foreground",
  },
  property: {
    icon: House01Icon,
    tone: "border-brand/20 bg-brand-soft text-brand-foreground",
  },
  tenant: {
    icon: Home01Icon,
    tone: "border-success/20 bg-success-soft text-success-foreground",
  },
};

function PartyStack({
  role,
  people,
  label,
  emptyLabel,
  emptyHref,
}: {
  role: MapRole;
  people: MapPerson[];
  label: string;
  emptyLabel: string;
  emptyHref?: string;
}) {
  if (people.length === 0) {
    return (
      <NodeCard role={role} href={emptyHref} label={label} empty>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground/60">
          <Icon icon={UserIcon} size={16} />
        </span>
        <p className="text-sm whitespace-nowrap text-muted-foreground">
          {emptyLabel}
        </p>
      </NodeCard>
    );
  }
  return (
    <div className="flex flex-col items-center gap-9">
      {people.map((person) => (
        <NodeCard key={person.id} role={role} href={person.href} label={label}>
          <PersonAvatar
            src={person.imageUrl}
            initials={initialsOf(person.name)}
            className="size-9 text-xs"
          />
          <div>
            <p className="text-sm font-medium whitespace-nowrap">
              {person.name}
            </p>
            {person.subtitle ? (
              <p className="text-xs whitespace-nowrap text-muted-foreground">
                {person.subtitle}
              </p>
            ) : null}
          </div>
        </NodeCard>
      ))}
    </div>
  );
}

function PropertyNode({
  property,
  label,
}: {
  property: MapProperty;
  label: string;
}) {
  const icon: IconSvgElement =
    PROPERTY_TYPE_ICONS[property.type] ?? House01Icon;
  return (
    <NodeCard role="property" href={property.href} label={label} featured>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Icon icon={icon} size={18} />
      </span>
      <div>
        <p className="text-sm font-medium whitespace-nowrap">
          {property.title}
        </p>
        {property.address ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
            <Icon
              icon={Location01Icon}
              size={16}
              className="size-3.5 shrink-0"
            />
            {property.address}
          </p>
        ) : null}
      </div>
    </NodeCard>
  );
}

/** Node card with its role tab on the top-left corner, outside the layout box. */
function NodeCard({
  role,
  href,
  label,
  featured,
  empty,
  children,
}: {
  role: MapRole;
  href?: string;
  label: string;
  featured?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}) {
  const tag = ROLE_TAGS[role];
  const inner = (
    <div
      className={cn(
        "relative flex w-max items-center gap-2.5 rounded-xl rounded-tl-none p-3 text-left whitespace-nowrap transition-colors",
        featured ? MAP_PROPERTY_WIDTH : MAP_PARTY_WIDTH,
        empty
          ? "border-[0.5px] border-dashed border-foreground/20 bg-card/60"
          : "border-[0.5px] border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        featured && "border-foreground/15 shadow-[0_2px_8px_rgb(0_0_0/0.06)]",
        href && "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "absolute bottom-full -left-[0.5px] inline-flex h-6 items-center gap-1 rounded-t-md border-[0.5px] border-b-0 px-2 text-[11px] font-medium whitespace-nowrap",
          tag.tone,
        )}
      >
        <Icon icon={tag.icon} size={16} className="size-3.5 shrink-0" />
        {label}
      </span>
      {children}
    </div>
  );

  if (!href) return inner;
  return (
    <Link
      href={href}
      draggable={false}
      className="rounded-xl outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  );
}

function PipelineTree({
  stages,
  href,
  kicker,
  onOpen,
}: {
  stages: MapStage[];
  href: string;
  kicker: string;
  onOpen: (applicationId: string) => void;
}) {
  if (stages.length === 0) return null;
  const total = stages.reduce((sum, stage) => sum + stage.households.length, 0);
  return (
    <div className="flex w-full flex-col items-center">
      <div
        aria-hidden
        className="h-5 w-px border-l border-dashed border-foreground/25"
      />
      <div className="relative">
        <Link
          href={href}
          draggable={false}
          className="absolute top-0 left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] tracking-[0.12em] text-muted-foreground uppercase shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
        >
          {kicker}
          <span className="tracking-normal text-muted-foreground/70 tabular-nums">
            {total}
          </span>
        </Link>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${stages.length}, ${MAP_STAGE_WIDTH})`,
          }}
        >
          {stages.map((stage, index) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              first={index === 0}
              last={index === stages.length - 1}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  first,
  last,
  onOpen,
}: {
  stage: MapStage;
  first: boolean;
  last: boolean;
  onOpen: (applicationId: string) => void;
}) {
  const empty = stage.households.length === 0;
  return (
    <div className="flex min-w-0 flex-col px-1">
      <BranchLine first={first} last={last} />
      <p className="flex min-h-10 items-center justify-center px-1 pt-1 pb-1.5 text-center text-xs leading-4 font-medium text-foreground/80">
        <span className="line-clamp-2 text-balance" title={stage.name}>
          <span
            className={cn(
              "mr-1.5 inline-block size-1.5 rounded-full align-middle",
              stageToneDot(stage.color),
            )}
          />
          {stage.name}
          <span className="ml-1 font-normal text-muted-foreground/70 tabular-nums">
            {stage.households.length}
          </span>
        </span>
      </p>
      <div
        className={cn(
          "flex min-h-20 flex-1 flex-col gap-1.5 rounded-xl p-1.5",
          empty
            ? "border border-dashed border-foreground/15"
            : "border border-foreground/5 bg-muted/80",
        )}
      >
        {stage.households.map((household) => (
          <HouseholdCard
            key={household.id}
            household={household}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function HouseholdCard({
  household,
  onOpen,
}: {
  household: MapHousehold;
  onOpen: (applicationId: string) => void;
}) {
  const shown = household.members.slice(
    0,
    household.members.length > 3 ? 2 : 3,
  );
  const extra = household.members.length - shown.length;
  return (
    <button
      type="button"
      onClick={() => onOpen(household.id)}
      className="flex w-full flex-col gap-1.5 rounded-lg border-[0.5px] border-border bg-card p-2 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors outline-none hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between gap-1">
        <span className="flex -space-x-1.5">
          {shown.map((member, index) =>
            member.unnamed ? (
              <span
                key={`u-${index}`}
                className="relative inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted ring-1 ring-card"
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
                src={member.imageUrl}
                initials={initialsOf(member.name)}
                className="size-6 text-[9px] ring-1 ring-card"
              />
            ),
          )}
          {extra > 0 ? (
            <span className="relative inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground ring-1 ring-card">
              +{extra}
            </span>
          ) : null}
        </span>
        {household.score != null ? (
          <Badge variant="info" className="shrink-0">
            {household.score}
          </Badge>
        ) : null}
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-[13px] leading-5 font-medium">
          {household.title}
        </span>
        {household.subtitle ? (
          <span className="block truncate text-[11px] leading-4 text-muted-foreground">
            {household.subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** Dashed branch from the applicants rail down into one stage column. */
function BranchLine({ first, last }: { first: boolean; last: boolean }) {
  return (
    <div aria-hidden className="relative -mx-1 h-5 shrink-0">
      {!first ? (
        <span className="absolute top-0 right-1/2 left-0 border-t border-dashed border-foreground/25" />
      ) : null}
      {!last ? (
        <span className="absolute top-0 right-0 left-1/2 border-t border-dashed border-foreground/25" />
      ) : null}
      <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-foreground/25" />
    </div>
  );
}
