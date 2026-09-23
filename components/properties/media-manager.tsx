"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Delete02Icon,
  Icon,
  ImageUpload01Icon,
  StarIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  attachMedia,
  createMediaUploadUrl,
  removeMedia,
  reorderMedia,
  setCoverMedia,
} from "@/app/(app)/properties/actions";
import { STORAGE_BUCKETS, mediaTypeOf } from "@/lib/storage-constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type MediaItem = { id: string; url: string | null; isCover: boolean };

export type MediaManagerHandle = {
  openFilePicker: () => void;
  acceptFiles: (files: FileList) => void;
};

function hasFileTransfer(event: React.DragEvent) {
  return [...event.dataTransfer.types].includes("Files");
}

type UploadState = { name: string; progress: "uploading" | "error" };

/**
 * Photo upload (drag-drop or picker), ordering (drag or arrows), cover
 * selection and removal. Files go straight to Supabase Storage with a
 * signed upload URL issued by a Server Action; the DB row is attached after.
 */
export const MediaManager = React.forwardRef<
  MediaManagerHandle,
  {
    propertyId: string;
    items: MediaItem[];
    canEdit: boolean;
    /** Overview card: add via header button; dropzone only while dragging files in. */
    uploadUi?: "dropzone" | "compact";
    /** When set, the parent owns file-drag hit target and overlay (e.g. full Photos card). */
    externalFileDragTarget?: boolean;
  }
>(function MediaManager(
  {
    propertyId,
    items,
    canEdit,
    uploadUi = "dropzone",
    externalFileDragTarget = false,
  },
  ref,
) {
  const t = useTranslations("properties.media");
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = React.useState<UploadState[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [fileDragOver, setFileDragOver] = React.useState(false);
  const fileDragDepth = React.useRef(0);
  const [order, setOrder] = React.useState(items.map((i) => i.id));
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  React.useImperativeHandle(ref, () => ({
    openFilePicker: () => inputRef.current?.click(),
    acceptFiles: (files: FileList) => {
      void uploadFiles(files);
    },
  }));

  React.useEffect(() => {
    setOrder(items.map((i) => i.id));
  }, [items]);

  const byId = React.useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  async function uploadFiles(files: FileList | File[]) {
    if (!canEdit) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploads(list.map((f) => ({ name: f.name, progress: "uploading" })));

    const supabase = createSupabaseBrowserClient();
    for (const file of list) {
      try {
        const contentType = mediaTypeOf(file.type, file.name);
        if (!contentType) {
          toast.error(t("errors.unsupported_type"));
          continue;
        }
        const signed = await createMediaUploadUrl({
          propertyId,
          fileName: file.name,
          contentType,
          size: file.size,
        });
        if (!signed.ok || !signed.data) {
          const key = signed.ok ? "upload_failed" : signed.error;
          toast.error(
            key === "unsupported_type" || key === "too_large"
              ? t(`errors.${key}`)
              : t("errors.upload_failed"),
          );
          continue;
        }
        const { error } = await supabase.storage
          .from(STORAGE_BUCKETS.media)
          .uploadToSignedUrl(signed.data.path, signed.data.token, file, {
            contentType,
          });
        if (error) throw error;
        const attached = await attachMedia(propertyId, signed.data.path);
        if (!attached.ok) throw new Error(attached.error);
      } catch (err) {
        console.error("[media] upload failed", err);
        toast.error(t("errors.upload_failed"));
      } finally {
        setUploads((u) => u.filter((x) => x.name !== file.name));
      }
    }
    router.refresh();
  }

  function commitOrder(next: string[]) {
    setOrder(next);
    startTransition(async () => {
      const result = await reorderMedia(propertyId, next);
      if (!result.ok) toast.error(t("errors.upload_failed"));
    });
  }

  function move(id: string, delta: -1 | 1) {
    const index = order.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    next.splice(index, 1);
    next.splice(target, 0, id);
    commitOrder(next);
  }

  function onDropReorder(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((x) => x !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    setDragId(null);
    commitOrder(next);
  }

  function onFileDragEnter(event: React.DragEvent) {
    if (!canEdit || !hasFileTransfer(event) || dragId) return;
    event.preventDefault();
    fileDragDepth.current += 1;
    setFileDragOver(true);
  }

  function onFileDragLeave(event: React.DragEvent) {
    if (!canEdit || !hasFileTransfer(event)) return;
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
    if (fileDragDepth.current === 0) setFileDragOver(false);
  }

  function onFileDragOver(event: React.DragEvent) {
    if (!canEdit || dragId || !hasFileTransfer(event)) return;
    event.preventDefault();
    setFileDragOver(true);
  }

  function onFileDrop(event: React.DragEvent) {
    if (!canEdit || dragId) return;
    if (!hasFileTransfer(event)) return;
    event.preventDefault();
    fileDragDepth.current = 0;
    setFileDragOver(false);
    setDragOver(false);
    void uploadFiles(event.dataTransfer.files);
  }

  const showDropzoneOverlay =
    canEdit &&
    uploadUi === "compact" &&
    !externalFileDragTarget &&
    fileDragOver &&
    !dragId;
  const showAlwaysDropzone = canEdit && uploadUi === "dropzone";

  const fileInput = canEdit ? (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic"
      multiple
      className="sr-only"
      onChange={(e) => {
        if (e.target.files) void uploadFiles(e.target.files);
        e.target.value = "";
      }}
    />
  ) : null;

  const dropzonePanel = (
    <>
      <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon icon={ImageUpload01Icon} size={18} />
      </span>
      <p className="text-sm font-medium">{t("dropzone_title")}</p>
      <p className="text-xs text-muted-foreground">{t("dropzone_hint")}</p>
      {uploads.length > 0 ? (
        <p className="text-xs text-brand-foreground">
          {t("uploading", { count: uploads.length })}
        </p>
      ) : null}
    </>
  );

  return (
    <div
      className={cn("relative space-y-4", uploadUi === "compact" && "min-h-0")}
      onDragEnter={
        uploadUi === "compact" && !externalFileDragTarget
          ? onFileDragEnter
          : undefined
      }
      onDragLeave={
        uploadUi === "compact" && !externalFileDragTarget
          ? onFileDragLeave
          : undefined
      }
      onDragOver={
        uploadUi === "compact" && !externalFileDragTarget
          ? onFileDragOver
          : undefined
      }
      onDrop={
        uploadUi === "compact" && !externalFileDragTarget
          ? onFileDrop
          : undefined
      }
    >
      {fileInput}

      {showAlwaysDropzone ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragId) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (dragId) return;
            void uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
            dragOver
              ? "border-brand bg-brand-soft/60"
              : "hover:border-foreground/30",
          )}
        >
          {dropzonePanel}
        </div>
      ) : null}

      {showDropzoneOverlay ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand bg-brand-soft/80 px-6 py-8 text-center backdrop-blur-[2px]"
          aria-live="polite"
        >
          {dropzonePanel}
        </div>
      ) : null}

      {uploadUi === "compact" && uploads.length > 0 ? (
        <p className="text-xs text-brand-foreground">
          {t("uploading", { count: uploads.length })}
        </p>
      ) : null}

      {order.length === 0 && !showDropzoneOverlay ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : order.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {order.map((id, index) => {
            const item = byId.get(id);
            if (!item) return null;
            return (
              <li
                key={id}
                draggable={canEdit}
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropReorder(id);
                }}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-secondary",
                  dragId === id && "opacity-50",
                  canEdit && "cursor-grab active:cursor-grabbing",
                )}
              >
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URL
                  <img
                    src={item.url}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : null}
                {item.isCover ? (
                  <Badge variant="brand" className="absolute top-2 left-2">
                    {t("cover")}
                  </Badge>
                ) : null}
                {canEdit ? (
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-lg bg-gradient-to-t from-foreground/70 via-foreground/35 to-transparent px-2 pt-10 pb-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("move_left")}
                        disabled={index === 0}
                        className="text-primary-foreground hover:bg-primary-foreground/15 disabled:opacity-40"
                        onClick={() => move(id, -1)}
                      >
                        <Icon icon={ArrowLeft02Icon} size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("move_right")}
                        disabled={index === order.length - 1}
                        className="text-primary-foreground hover:bg-primary-foreground/15 disabled:opacity-40"
                        onClick={() => move(id, 1)}
                      >
                        <Icon icon={ArrowRight02Icon} size={16} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {!item.isCover ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("set_cover")}
                          className="text-primary-foreground hover:bg-primary-foreground/15"
                          onClick={() =>
                            startTransition(async () => {
                              await setCoverMedia(propertyId, id);
                              router.refresh();
                            })
                          }
                        >
                          <Icon icon={StarIcon} size={16} />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("remove")}
                        className="text-primary-foreground hover:bg-destructive/25 hover:text-destructive-foreground"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await removeMedia(propertyId, id);
                            if (!res.ok) toast.error(t("errors.upload_failed"));
                            router.refresh();
                          })
                        }
                      >
                        <Icon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});
MediaManager.displayName = "MediaManager";
