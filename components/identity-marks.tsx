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
  const [loaded, setLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const showImage = Boolean(src) && !failed;

  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  // The image can settle before hydration attaches onLoad / onError.
  React.useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth === 0) setFailed(true);
    else setLoaded(true);
  }, [src, showImage]);

  return (
    <span
      className={cn(
        "relative inline-grid size-8 shrink-0 place-items-center overflow-hidden bg-muted text-xs font-medium leading-none text-muted-foreground select-none",
        shape === "circle" ? "rounded-full" : "rounded-md",
        className,
        "bg-muted leading-none text-muted-foreground",
      )}
    >
      {showImage && loaded ? null : initials}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={src!}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover",
            !loaded && "invisible",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
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
