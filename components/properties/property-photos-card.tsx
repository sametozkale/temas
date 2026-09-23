"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Icon, ImageUpload01Icon, PlusSignIcon } from "@/components/icons";
import {
  MediaManager,
  type MediaItem,
  type MediaManagerHandle,
} from "@/components/properties/media-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function hasFileTransfer(event: React.DragEvent) {
  return [...event.dataTransfer.types].includes("Files");
}

export function PropertyPhotosCard({
  propertyId,
  items,
  canEdit,
}: {
  propertyId: string;
  items: MediaItem[];
  canEdit: boolean;
}) {
  const tOverview = useTranslations("properties.overview");
  const tMedia = useTranslations("properties.media");
  const mediaRef = React.useRef<MediaManagerHandle>(null);
  const [fileDragOver, setFileDragOver] = React.useState(false);
  const fileDragDepth = React.useRef(0);

  function onFileDragEnter(event: React.DragEvent) {
    if (!canEdit || !hasFileTransfer(event)) return;
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
    if (!canEdit || !hasFileTransfer(event)) return;
    event.preventDefault();
    setFileDragOver(true);
  }

  function onFileDrop(event: React.DragEvent) {
    if (!canEdit || !hasFileTransfer(event)) return;
    event.preventDefault();
    fileDragDepth.current = 0;
    setFileDragOver(false);
    mediaRef.current?.acceptFiles(event.dataTransfer.files);
  }

  return (
    <Card
      className={cn(canEdit && "relative overflow-hidden")}
      onDragEnter={canEdit ? onFileDragEnter : undefined}
      onDragLeave={canEdit ? onFileDragLeave : undefined}
      onDragOver={canEdit ? onFileDragOver : undefined}
      onDrop={canEdit ? onFileDrop : undefined}
    >
      {canEdit && fileDragOver ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand bg-brand-soft/80 px-6 py-8 text-center backdrop-blur-[2px]"
          aria-live="polite"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Icon icon={ImageUpload01Icon} size={18} />
          </span>
          <p className="text-sm font-medium">{tMedia("dropzone_title")}</p>
          <p className="text-xs text-muted-foreground">{tMedia("dropzone_hint")}</p>
        </div>
      ) : null}
      <CardHeader>
        <CardTitle>{tOverview("photos")}</CardTitle>
        {canEdit ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => mediaRef.current?.openFilePicker()}
            >
              <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
              {tOverview("add_photos")}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <MediaManager
          ref={mediaRef}
          propertyId={propertyId}
          items={items}
          canEdit={canEdit}
          uploadUi="compact"
          externalFileDragTarget
        />
      </CardContent>
    </Card>
  );
}
