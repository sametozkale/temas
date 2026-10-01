"use client";

import * as React from "react";
import { cn } from "cn";
import { Avatar as AvatarPrimitive } from "radix-ui";

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg";
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "t-avatar-item group/avatar relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "t-avatar-image absolute inset-0 size-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "col-start-1 row-start-1 inline-grid size-full place-items-center rounded-full bg-muted text-sm leading-none text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0.5 bottom-0.5 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({
  className,
  onPointerOver,
  onPointerLeave,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<"div">) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const setRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const setShifts = React.useCallback(
    (activeIndex: number | null, phase: "in" | "out") => {
      const root = rootRef.current;
      if (
        !root ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const tokens = getComputedStyle(document.documentElement);
      const readNumber = (name: string, fallback: number) => {
        const value = Number.parseFloat(tokens.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      const readEasing = (name: string, fallback: string) =>
        tokens.getPropertyValue(name).trim() || fallback;
      const lift = readNumber("--avatar-lift", -4);
      const falloff = readNumber("--avatar-falloff", 0.45);
      const scale = readNumber("--avatar-scale", 1.05);
      const timingFunction =
        phase === "out"
          ? readEasing("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
          : readEasing("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

      root
        .querySelectorAll<HTMLElement>(":scope > .t-avatar-item")
        .forEach((avatar, index) => {
          avatar.style.transitionTimingFunction = timingFunction;
          avatar.style.zIndex =
            activeIndex === index ? "2" : activeIndex == null ? "" : "1";

          if (activeIndex == null) {
            avatar.style.setProperty("--shift", "0px");
            avatar.style.setProperty("--scale-active", "1");
            return;
          }

          const distance = Math.abs(index - activeIndex);
          avatar.style.setProperty(
            "--shift",
            `${(lift * Math.pow(falloff, distance)).toFixed(3)}px`,
          );
          avatar.style.setProperty(
            "--scale-active",
            index === activeIndex ? String(scale) : "1",
          );
        });
    },
    [],
  );

  const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerOver?.(event);
    if (event.defaultPrevented || event.pointerType === "touch") return;

    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-slot="avatar"], [data-slot="avatar-group-count"]',
    );
    const previous = (event.relatedTarget as HTMLElement | null)?.closest?.(
      '[data-slot="avatar"], [data-slot="avatar-group-count"]',
    );
    if (
      !target ||
      target === previous ||
      target.parentElement !== rootRef.current
    ) {
      return;
    }

    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(
        ":scope > .t-avatar-item",
      ) ?? [],
    );
    const activeIndex = items.indexOf(target);
    if (activeIndex >= 0) setShifts(activeIndex, "in");
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (!event.defaultPrevented && event.pointerType !== "touch") {
      setShifts(null, "out");
    }
  };

  return (
    <div
      ref={setRootRef}
      data-slot="avatar-group"
      className={cn(
        "t-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className,
      )}
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "t-avatar-item relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
};
