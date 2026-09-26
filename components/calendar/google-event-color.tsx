"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { setGoogleEventColor } from "@/app/(app)/calendar/actions";
import { EventChip } from "@/components/event-chip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GoogleDayEvent, GoogleEventSwatch } from "@/lib/calendar/google";
import { presentGoogleSwatches } from "@/lib/calendar/google-palette";
import { cn } from "@/lib/utils";

type Paint = {
  calendarId: string;
  eventId: string;
  seriesKey: string;
  colorId: string;
  color: string;
};

type ColorContextValue = {
  palette: GoogleEventSwatch[];
  labels: Record<string, GoogleEventSwatch[]>;
  overrides: Record<string, { colorId: string; color: string }>;
  paint: (input: Paint) => void;
};

const ColorContext = createContext<ColorContextValue | null>(null);

export function GoogleEventColorProvider({
  palette,
  labels,
  children,
}: {
  palette: GoogleEventSwatch[];
  labels: Record<string, GoogleEventSwatch[]>;
  children: ReactNode;
}) {
  const t = useTranslations("calendar");
  const [overrides, setOverrides] = useState<
    Record<string, { colorId: string; color: string }>
  >({});
  const overridesRef = useRef(overrides);

  function paint(input: Paint) {
    const previous = overridesRef.current[input.seriesKey];
    const next = {
      ...overridesRef.current,
      [input.seriesKey]: { colorId: input.colorId, color: input.color },
    };
    overridesRef.current = next;
    setOverrides(next);
    void setGoogleEventColor({
      calendarId: input.calendarId,
      eventId: input.eventId,
      colorId: input.colorId,
    }).then((result) => {
      if (result.ok) return;
      setOverrides((current) => {
        const restored = { ...current };
        if (previous) restored[input.seriesKey] = previous;
        else delete restored[input.seriesKey];
        overridesRef.current = restored;
        return restored;
      });
      toast.error(
        result.error === "reconnect"
          ? t("google_reconnect")
          : t("google_color_failed"),
      );
    });
  }

  return (
    <ColorContext.Provider value={{ palette, labels, overrides, paint }}>
      {children}
    </ColorContext.Provider>
  );
}

export function useGoogleEventColor(
  seriesKey: string,
  color: string | null,
  colorId: string | null,
) {
  const ctx = useContext(ColorContext);
  const override = ctx?.overrides[seriesKey];
  return {
    color: override?.color ?? color,
    colorId: override?.colorId ?? colorId,
    palette: ctx?.palette ?? [],
    labels: ctx?.labels ?? {},
    paint: ctx?.paint,
  };
}

export function GoogleEventColorMenu({
  children,
  enabled,
  calendarId,
  eventId,
  seriesKey,
  color,
  colorId,
}: {
  children: ReactNode;
  enabled: boolean;
  calendarId: string;
  eventId: string;
  seriesKey: string;
  color: string | null;
  colorId: string | null;
}) {
  const t = useTranslations("calendar");
  const painted = useGoogleEventColor(seriesKey, color, colorId);
  const swatches = presentGoogleSwatches(
    painted.labels[calendarId]?.length
      ? painted.labels[calendarId]
      : painted.palette,
  );
  if (!enabled || swatches.length === 0 || !painted.paint) {
    return children;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-auto p-2">
        <p className="px-0.5 pb-1.5 text-xs text-muted-foreground">
          {t("google_color")}
        </p>
        <div className="grid w-[13.5rem] grid-cols-6 gap-1.5">
          {swatches.map((swatch, index) => (
            <ColorSwatch
              key={swatch.id}
              name={swatch.name}
              color={swatch.color}
              selected={painted.colorId === swatch.id}
              label={swatch.name || t("google_color_swatch", { n: String(index + 1) })}
              onSelect={() =>
                painted.paint?.({
                  calendarId,
                  eventId,
                  seriesKey,
                  colorId: swatch.id,
                  color: swatch.color,
                })
              }
            />
          ))}
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ColorSwatch({
  name,
  color,
  selected,
  label,
  onSelect,
}: {
  name: string;
  color: string;
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const swatch = (
    <ContextMenuItem
      aria-label={label}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className={cn(
        "h-5 w-full rounded-[3px] p-0 focus:bg-transparent data-highlighted:bg-transparent",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 18%, var(--card))`,
      }}
      onSelect={onSelect}
    />
  );
  if (!name) return swatch;
  return (
    <Popover open={open}>
      <PopoverTrigger asChild>{swatch}</PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto px-2 py-1 text-xs"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {name}
      </PopoverContent>
    </Popover>
  );
}

export function GoogleEventListRow({
  event,
  timeLabel,
}: {
  event: GoogleDayEvent;
  timeLabel: string;
}) {
  const painted = useGoogleEventColor(event.seriesKey, event.color, event.colorId);
  return (
    <GoogleEventColorMenu
      enabled={event.writable}
      calendarId={event.calendarId}
      eventId={event.seriesKey}
      seriesKey={event.seriesKey}
      color={event.color}
      colorId={event.colorId}
    >
      <div>
        <EventChip
          tone="muted"
          accent={painted.color}
          time={timeLabel}
          title={event.title}
          meta={[event.when, event.location, event.calendarName]
            .filter(Boolean)
            .join(" · ")}
          comfortable
        />
      </div>
    </GoogleEventColorMenu>
  );
}
