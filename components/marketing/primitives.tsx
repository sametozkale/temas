import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const SIGNUP_HREF = "/login?intent=signup";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm text-muted-foreground">{children}</p>;
}

export function Display({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-serif text-4xl leading-[1.05] font-normal tracking-tight text-balance sm:text-5xl",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Beige panel with printer's crop marks just outside each corner. */
export function CropPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const mark = "pointer-events-none absolute size-4 border-foreground/70";
  return (
    <div className={cn("relative bg-secondary", className)}>
      <span aria-hidden className={cn(mark, "-top-4 -left-4 border-t border-l")} />
      <span aria-hidden className={cn(mark, "-top-4 -right-4 border-t border-r")} />
      <span aria-hidden className={cn(mark, "-bottom-4 -left-4 border-b border-l")} />
      <span aria-hidden className={cn(mark, "-right-4 -bottom-4 border-r border-b")} />
      {children}
    </div>
  );
}

const POLAROIDS = {
  keys: "/marketing/agent-keys.webp",
  viewing: "/marketing/agent-viewing.webp",
  office: "/marketing/agent-office.webp",
  street: "/marketing/agent-street.webp",
  handover: "/marketing/agent-handover.webp",
} as const;

export function Polaroid({
  photo,
  caption,
  className,
}: {
  photo: keyof typeof POLAROIDS;
  caption?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "bg-card p-2 pb-1 shadow-[0_1px_3px_rgb(0_0_0/0.08)] ring-1 ring-foreground/5",
        className,
      )}
    >
      <Image
        src={POLAROIDS[photo]}
        alt=""
        width={900}
        height={900}
        sizes="200px"
        className="aspect-square w-full object-cover"
      />
      <figcaption className="h-8 px-1 pt-1 font-hand text-xl leading-none text-foreground/80">
        {caption}
      </figcaption>
    </figure>
  );
}
