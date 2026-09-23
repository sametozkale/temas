"use client";

import * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

type FileInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "size" | "value"
> & {
  buttonLabel: string;
  emptyLabel: string;
  onFileChange?: (file: File | null) => void;
};

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(
    {
      className,
      id,
      disabled,
      buttonLabel,
      emptyLabel,
      onFileChange,
      onChange,
      ...props
    },
    ref,
  ) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0] ?? null;
      setFileName(file?.name ?? null);
      onFileChange?.(file);
      onChange?.(event);
    }

    return (
      <div
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-2 shadow-none transition-colors has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <input
          {...props}
          ref={inputRef}
          id={id}
          type="file"
          disabled={disabled}
          className="sr-only"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 bg-card"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {buttonLabel}
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {fileName ?? emptyLabel}
        </span>
      </div>
    );
  },
);

export { FileInput };
