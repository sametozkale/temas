"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  attachDocument,
  createDocumentUploadUrl,
  deleteDocument,
  getDocumentDownloadUrl,
  toggleDocumentShared,
} from "@/app/(app)/properties/actions";
import { EmptyState } from "@/components/empty-state";
import {
  Delete02Icon,
  Download01Icon,
  Folder01Icon,
  Icon,
  PlusSignIcon,
  SquareLock01Icon,
  SquareUnlock01Icon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/db/schema";
import { formatBytes, formatDate } from "@/lib/format";
import { DOCUMENT_MAX_BYTES, STORAGE_BUCKETS } from "@/lib/storage-constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type DocumentRow = {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
  createdByName: string | null;
  size?: number;
  shared: boolean;
};

export function FilesSection({
  propertyId,
  documents,
  canEdit,
}: {
  propertyId: string;
  documents: DocumentRow[];
  canEdit: boolean;
}) {
  const t = useTranslations("properties.files");
  const tKinds = useTranslations("properties.files.kinds");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {canEdit ? (
          <Button variant="pill" size="sm" onClick={() => setOpen(true)}>
            <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
            {t("upload")}
          </Button>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={Folder01Icon}
          title={t("empty_title")}
          description={t("empty_description")}
          action={
            canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                {t("upload")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="gap-0 overflow-x-auto py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_title")}</TableHead>
                <TableHead>{t("col_kind")}</TableHead>
                <TableHead>{t("col_uploaded")}</TableHead>
                <TableHead>{t("col_size")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant={doc.shared ? "info" : "outline"}>
                        {doc.shared ? t("shared_badge") : t("private_badge")}
                      </Badge>
                    </div>
                    {doc.createdByName ? (
                      <p className="text-xs text-muted-foreground">
                        {doc.createdByName}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tKinds(
                      (DOCUMENT_KINDS as readonly string[]).includes(doc.kind)
                        ? (doc.kind as DocumentKind)
                        : "other",
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatBytes(doc.size) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("download")}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await getDocumentDownloadUrl(
                              propertyId,
                              doc.id,
                            );
                            if (res.ok && res.data) {
                              window.location.href = res.data.url;
                            }
                          })
                        }
                      >
                        <Icon icon={Download01Icon} size={16} />
                      </Button>
                      {canEdit ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={doc.shared ? t("unshare") : t("share")}
                            onClick={() =>
                              startTransition(async () => {
                                await toggleDocumentShared(
                                  propertyId,
                                  doc.id,
                                  !doc.shared,
                                );
                                router.refresh();
                              })
                            }
                          >
                            <Icon
                              icon={
                                doc.shared
                                  ? SquareUnlock01Icon
                                  : SquareLock01Icon
                              }
                              size={16}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t("delete")}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await deleteDocument(
                                  propertyId,
                                  doc.id,
                                );
                                if (res.ok) toast.success(t("deleted"));
                                router.refresh();
                              })
                            }
                          >
                            <Icon icon={Delete02Icon} size={16} />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {open ? (
        <UploadDialog propertyId={propertyId} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function UploadDialog({
  propertyId,
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const t = useTranslations("properties.files");
  const tKinds = useTranslations("properties.files.kinds");
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [kind, setKind] = React.useState<DocumentKind>("contract");
  const [title, setTitle] = React.useState("");
  const [shared, setShared] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("file_required");
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setError("too_large");
      return;
    }
    if (!title.trim()) {
      setError("title");
      return;
    }
    startTransition(async () => {
      const signed = await createDocumentUploadUrl({
        propertyId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
      if (!signed.ok || !signed.data) {
        setError(
          signed.ok
            ? "upload_failed"
            : signed.error === "too_large"
              ? "too_large"
              : "upload_failed",
        );
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.documents)
        .uploadToSignedUrl(signed.data.path, signed.data.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) {
        setError("upload_failed");
        return;
      }
      const attached = await attachDocument({
        propertyId,
        storagePath: signed.data.path,
        originalName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        kind,
        title: title.trim(),
        shared,
      });
      if (!attached.ok) {
        setError("upload_failed");
        return;
      }
      toast.success(t("uploaded"));
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{t("upload_title")}</DialogTitle>
            <DialogDescription>{t("max_size")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="doc-kind">{t("kind")}</FieldLabel>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as DocumentKind)}
              >
                <SelectTrigger id="doc-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {tKinds(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={error === "title" ? true : undefined}>
              <FieldLabel htmlFor="doc-title">{t("doc_title")}</FieldLabel>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              {error === "title" ? (
                <FieldError>{t("errors.title")}</FieldError>
              ) : null}
            </Field>
            <Field
              data-invalid={
                error === "file_required" || error === "too_large"
                  ? true
                  : undefined
              }
            >
              <FieldLabel htmlFor="doc-file">{t("file")}</FieldLabel>
              <Input
                id="doc-file"
                ref={fileRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setFileName(f?.name ?? null);
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              <p className="text-xs text-muted-foreground">
                {fileName ?? t("choose_file")}
              </p>
              {error === "file_required" || error === "too_large" ? (
                <FieldError>{t(`errors.${error}`)}</FieldError>
              ) : null}
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={shared}
                onCheckedChange={(v) => setShared(v === true)}
                className="mt-0.5"
              />
              <span>
                {t("shared")}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("shared_hint")}
                </span>
              </span>
            </label>
            {error === "upload_failed" ? (
              <FieldError>{t("errors.upload_failed")}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
