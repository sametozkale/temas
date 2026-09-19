"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function IdentityMark({
  src,
  initials,
  className,
  shape,
}: {
  src?: string | null;
  initials: string;
  className?: string;
  shape: "circle" | "square";
}) {
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(src) && !failed;

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      className={cn(
        "relative inline-grid size-8 shrink-0 place-items-center overflow-hidden bg-muted text-xs font-medium leading-none text-muted-foreground select-none",
        shape === "circle" ? "rounded-full" : "rounded-md",
        className,
        "bg-muted leading-none text-muted-foreground",
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function PersonAvatar({
  src,
  initials,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  initials: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <IdentityMark
      src={src}
      initials={initials}
      className={cn(fallbackClassName, className)}
      shape="circle"
    />
  );
}

export function WorkspaceMark({
  src,
  initials,
  className,
}: {
  src?: string | null;
  initials: string;
  className?: string;
}) {
  return (
    <IdentityMark
      src={src}
      initials={initials}
      className={className}
      shape="square"
    />
  );
}
