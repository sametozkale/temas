"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ArrowUp02Icon,
  Cancel01Icon,
  File01Icon,
  Icon,
  PlusSignIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const MAX_COMPOSER_PX = 200;
const LINE_PX = 24;
const PAD_Y_COLLAPSED = 20;
const PAD_TOP_EXPANDED = 10;
const PAD_BOTTOM_EXPANDED = 48;
const COLLAPSED_H = PAD_Y_COLLAPSED + LINE_PX;
const MAX_FILES = 4;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx";
const TYPE_MS = 38;
const DELETE_MS = 22;
const HOLD_MS = 1600;
const GAP_MS = 420;

type ComposerFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function fileLabel(file: File) {
  const ext = file.name.split(".").pop()?.toUpperCase();
  return ext && ext !== file.name.toUpperCase() ? ext : "FILE";
}

function toFileList(files: File[]) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  return transfer.files;
}

function useTypedPlaceholder(
  examples: string[],
  active: boolean,
  fallback: string,
) {
  const [text, setText] = React.useState("");
  const examplesRef = React.useRef(examples);
  examplesRef.current = examples;
  const key = examples.join("\0");

  React.useEffect(() => {
    if (!active || examplesRef.current.length === 0) {
      setText(fallback);
      return;
    }
    const list = examplesRef.current;
    if (prefersReducedMotion()) {
      setText(list[0] ?? fallback);
      return;
    }

    let index = 0;
    let char = 0;
    let deleting = false;
    let timer = 0;

    const tick = () => {
      const full = examplesRef.current[index] ?? "";
      if (!deleting) {
        char = Math.min(char + 1, full.length);
        setText(full.slice(0, char));
        if (char >= full.length) {
          deleting = true;
          timer = window.setTimeout(tick, HOLD_MS);
          return;
        }
        timer = window.setTimeout(tick, TYPE_MS);
        return;
      }
      char = Math.max(char - 1, 0);
      setText(full.slice(0, char));
      if (char <= 0) {
        deleting = false;
        index = (index + 1) % examplesRef.current.length;
        timer = window.setTimeout(tick, GAP_MS);
        return;
      }
      timer = window.setTimeout(tick, DELETE_MS);
    };

    timer = window.setTimeout(tick, 240);
    return () => window.clearTimeout(timer);
  }, [active, fallback, key]);

  return text;
}

type PromptBarProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  placeholder?: string;
  /** Cycles through the empty-state placeholder as a typewriter. */
  examples?: string[];
  /** Suggestion chips shown above the input; clicking one fills the field. */
  suggestions?: string[];
  onSubmit?: (value: string, files: File[]) => void | Promise<void>;
  disabled?: boolean;
};

/**
 * Granola ask field: pill while the prompt fits on one line; ChatGPT-style
 * stack (text grows up, + and send stay on the bottom row) once it wraps
 * or files are attached. Perplexity-style chips sit above the textarea.
 * The only permitted shadow in the app: a 1px subtle one (docs/01 §4).
 */
export function PromptBar({
  placeholder,
  examples = [],
  suggestions = [],
  onSubmit,
  disabled,
  className,
  ...props
}: PromptBarProps) {
  const t = useTranslations("common");
  const [value, setValue] = React.useState("");
  const [files, setFiles] = React.useState<ComposerFile[]>([]);
  const [focused, setFocused] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const measureRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);
  const readyRef = React.useRef(false);
  const filesRef = React.useRef(files);
  filesRef.current = files;
  const hint = placeholder ?? t("prompt_placeholder");
  const stacked = expanded || files.length > 0;
  const animate =
    examples.length > 0 && !value && !focused && !disabled && files.length === 0;
  const typed = useTypedPlaceholder(examples, animate, hint);
  const showSuggestions = !value && files.length === 0 && suggestions.length > 0;
  const canSend = (Boolean(value.trim()) || files.length > 0) && !disabled;
  const placeholderText =
    animate && typed.length > 0 ? `${typed}|` : animate ? "|" : typed;

  React.useEffect(() => {
    return () => {
      for (const item of filesRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(
        prev.map((item) => `${item.file.name}:${item.file.size}`),
      );
      const room = MAX_FILES - prev.length;
      if (room <= 0) {
        toast.error(t("too_many_attachments", { count: MAX_FILES }));
        return prev;
      }
      const next = [...prev];
      for (const file of incoming) {
        const key = `${file.name}:${file.size}`;
        if (seen.has(key)) continue;
        if (next.length >= MAX_FILES) {
          toast.error(t("too_many_attachments", { count: MAX_FILES }));
          break;
        }
        if (file.size > MAX_BYTES) {
          toast.error(t("attachment_too_large", { size: "8 MB" }));
          continue;
        }
        seen.add(key);
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: isImageFile(file)
            ? URL.createObjectURL(file)
            : undefined,
        });
      }
      return next;
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const gone = prev.find((item) => item.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function clearFiles() {
    setFiles((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
  }

  React.useLayoutEffect(() => {
    const measure = measureRef.current;
    const el = inputRef.current;
    if (!measure || !el) return;

    const lines = Math.max(
      1,
      Math.round((measure.scrollHeight - PAD_Y_COLLAPSED) / LINE_PX),
    );
    const nextExpanded =
      files.length > 0 || value.includes("\n") || lines > 1;
    if (nextExpanded !== expanded) {
      setExpanded(nextExpanded);
      return;
    }

    const to = Math.min(
      stacked
        ? PAD_TOP_EXPANDED + lines * LINE_PX + PAD_BOTTOM_EXPANDED
        : COLLAPSED_H,
      MAX_COMPOSER_PX,
    );
    const reduced = prefersReducedMotion();
    const from = el.offsetHeight;
    if (reduced || !readyRef.current || from === to) {
      el.style.height = `${to}px`;
    } else {
      el.style.height = `${from}px`;
      el.getBoundingClientRect();
      el.style.height = `${to}px`;
    }
    readyRef.current = true;
  }, [value, expanded, stacked, files.length]);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    if (document.activeElement === el) onFocus();
    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    const payload = files.map((item) => item.file);
    await onSubmit?.(trimmed, payload);
    setValue("");
    clearFiles();
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-2", className)}>
      {showSuggestions ? (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
          {suggestions.slice(0, 2).map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="pill"
              size="xs"
              disabled={disabled}
              onClick={() => {
                setValue(suggestion);
                inputRef.current?.focus();
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          if (event.dataTransfer.types.includes("Files")) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-[22px] border-[0.5px] bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[box-shadow,border-color] duration-200 ease-out outline-none",
          dragging
            ? "border-foreground/25"
            : focused
              ? "border-foreground/15"
              : "border-border",
        )}
        {...props}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {files.length > 0 ? (
          <ul className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1 [scrollbar-width:none]">
            {files.map((item) => (
              <li key={item.id}>
                <AttachmentChip
                  item={item}
                  disabled={disabled}
                  onRemove={() => removeFile(item.id)}
                  removeLabel={t("remove_attachment", {
                    name: item.file.name,
                  })}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="relative grid">
          <textarea
            ref={measureRef}
            tabIndex={-1}
            aria-hidden
            readOnly
            rows={1}
            value={value}
            className="pointer-events-none invisible absolute h-0 w-full resize-none overflow-hidden py-2.5 pr-12 pl-11 text-[15px] leading-6"
          />
          <textarea
            ref={inputRef}
            value={value}
            rows={1}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(event) => {
              if (event.clipboardData.files.length > 0) {
                addFiles(event.clipboardData.files);
              }
            }}
            onKeyDown={(event) => {
              if (
                event.key !== "Enter" ||
                event.shiftKey ||
                event.nativeEvent.isComposing
              ) {
                return;
              }
              event.preventDefault();
              if (!canSend) return;
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder={placeholderText}
            disabled={disabled}
            aria-label={hint}
            className={cn(
              "col-start-1 row-start-1 box-border min-w-0 resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50",
              "transition-[height] duration-200 ease-out motion-reduce:transition-none",
              stacked
                ? "max-h-[200px] overflow-y-auto px-4 pt-2.5 pb-12"
                : "overflow-hidden py-2.5 pr-12 pl-11",
            )}
          />
          <div className="pointer-events-none col-start-1 row-start-1 flex h-11 items-center justify-between self-end pr-1.5 pl-2">
            <button
              type="button"
              aria-label={t("attach")}
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Icon icon={PlusSignIcon} size={18} strokeWidth={2} />
            </button>
            <button
              type="submit"
              aria-label={t("send")}
              disabled={!canSend}
              className={cn(
                "pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon
                icon={ArrowUp02Icon}
                size={16}
                strokeWidth={2}
                className={cn(
                  "origin-center transition-transform duration-200 ease-out motion-reduce:transition-none",
                  value || files.length > 0 ? "rotate-0" : "rotate-90",
                )}
              />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AttachmentChip({
  item,
  disabled,
  onRemove,
  removeLabel,
}: {
  item: ComposerFile;
  disabled?: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const image = Boolean(item.previewUrl) && !broken;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border",
        image
          ? "size-16"
          : "flex h-14 w-[148px] items-center gap-2 bg-secondary pr-7 pl-2.5",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.previewUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <>
          <Icon
            icon={File01Icon}
            size={18}
            className="shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {item.file.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {fileLabel(item.file)}
            </p>
          </div>
        </>
      )}
      <button
        type="button"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <Icon icon={Cancel01Icon} size={16} />
      </button>
    </div>
  );
}

export { toFileList };
