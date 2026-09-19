"use client";

import * as React from "react";

import { PersonAvatar, WorkspaceMark } from "@/components/identity-marks";
import { Button } from "@/components/ui/button";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/storage-constants";

export type ImageUploadInvalid = "unsupported_type" | "too_large";

export function ImageUploadControl({
  imageUrl,
  initials,
  shape = "circle",
  disabled,
  changeLabel,
  removeLabel,
  onPick,
  onRemove,
  onInvalid,
}: {
  imageUrl: string | null;
  initials: string;
  shape?: "circle" | "square";
  disabled?: boolean;
  changeLabel: string;
  removeLabel: string;
  onPick: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  onInvalid?: (reason: ImageUploadInvalid) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const accept = AVATAR_MIME_TYPES.join(",");

  async function run(task: () => Promise<void>) {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      onInvalid?.("unsupported_type");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      onInvalid?.("too_large");
      return;
    }
    void run(() => onPick(file));
  }

  const preview =
    shape === "square" ? (
      <WorkspaceMark
        src={imageUrl}
        initials={initials}
        className="size-10 text-sm"
      />
    ) : (
      <PersonAvatar
        src={imageUrl}
        initials={initials}
        className="size-10"
        fallbackClassName="text-xs"
      />
    );

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {disabled ? (
        preview
      ) : (
        <button
          type="button"
          className="rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={changeLabel}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {preview}
        </button>
      )}
      {disabled ? null : (
        <div className="flex flex-col items-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {changeLabel}
          </Button>
          {imageUrl && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void run(onRemove)}
            >
              {removeLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
