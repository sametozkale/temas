"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  exportContract,
  saveContractBody,
  setContractDisclaimer,
  type ContractState,
} from "@/app/(app)/properties/[id]/contracts/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { markdownToBlocks, type MarkdownBlock } from "@/lib/contracts/markdown";
import { cn } from "@/lib/utils";

const TOKEN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

function fieldLabel(key: string) {
  const words = key.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function DocumentText({
  text,
  unfilled,
}: {
  text: string;
  unfilled: string;
}) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(TOKEN.source, "gi"))) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const key = match[1] ?? "";
    nodes.push(
      <span
        key={`${key}-${index}`}
        title={unfilled}
        className="inline-flex rounded-md bg-muted px-1.5 py-0.5 align-baseline text-xs text-muted-foreground"
      >
        {fieldLabel(key)}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function DocumentBlock({
  block,
  unfilled,
}: {
  block: MarkdownBlock;
  unfilled: string;
}) {
  if (block.kind === "h1") {
    return (
      <h2 className="font-serif text-xl font-medium tracking-tight">
        <DocumentText text={block.text} unfilled={unfilled} />
      </h2>
    );
  }
  if (block.kind === "h2") {
    return (
      <h3 className="pt-2 text-sm font-medium">
        <DocumentText text={block.text} unfilled={unfilled} />
      </h3>
    );
  }
  if (block.kind === "ul") {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
        {block.items.map((item, index) => (
          <li key={`${item}-${index}`}>
            <DocumentText text={item} unfilled={unfilled} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="text-sm leading-6">
      <DocumentText text={block.text} unfilled={unfilled} />
    </p>
  );
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ContractEditor({
  contractId,
  bodyMd,
  acknowledged,
  versions,
}: {
  contractId: string;
  bodyMd: string;
  acknowledged: boolean;
  versions: { savedAt: string; bodyMd: string }[];
}) {
  const t = useTranslations("contracts");
  const router = useRouter();
  const [body, setBody] = React.useState(bodyMd);
  const [mode, setMode] = React.useState<"document" | "edit">("document");
  const [ack, setAck] = React.useState(acknowledged);
  const [exporting, setExporting] = React.useState<"docx" | "pdf" | null>(null);
  const [state, action, pending] = useActionState<
    ContractState | undefined,
    FormData
  >(saveContractBody, undefined);

  React.useEffect(() => {
    setBody(bodyMd);
  }, [bodyMd]);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success(t("saved"));
    router.refresh();
  }, [state, t, router]);

  const dirty = body !== bodyMd;
  const preview = markdownToBlocks(body);
  const earlier = versions.slice().reverse().slice(1, 8);

  async function onAck(next: boolean) {
    setAck(next);
    const result = await setContractDisclaimer(contractId, next);
    if (!result.ok) {
      setAck(!next);
      toast.error(t("errors.generic"));
    }
    router.refresh();
  }

  async function onExport(format: "docx" | "pdf") {
    setExporting(format);
    const result = await exportContract(contractId, format);
    setExporting(null);
    if (!result.ok) {
      toast.error(
        result.error === "disclaimer"
          ? t("errors.disclaimer")
          : t("errors.generic"),
      );
      return;
    }
    toast.success(t("exported"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border bg-warning-soft px-4 py-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-warning-foreground">{t("disclaimer")}</p>
          <Field orientation="horizontal">
            <Checkbox
              id="disclaimer"
              checked={ack}
              onCheckedChange={(value) => void onAck(value === true)}
            />
            <FieldLabel htmlFor="disclaimer">{t("acknowledge")}</FieldLabel>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={dirty ? "outline" : "default"}
            disabled={!ack || exporting !== null}
            onClick={() => void onExport("docx")}
          >
            {t("export_docx")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!ack || exporting !== null}
            onClick={() => void onExport("pdf")}
          >
            {t("export_pdf")}
          </Button>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="contractId" value={contractId} />
        <input type="hidden" name="bodyMd" value={body} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex h-8 items-center rounded-full bg-muted p-0.5"
            role="group"
            aria-label={t("document")}
          >
            {(["document", "edit"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "h-7 rounded-full px-3 text-xs",
                  mode === value
                    ? "bg-card text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t(value)}
              </button>
            ))}
          </div>
          {dirty ? (
            <Button type="submit" size="sm" disabled={pending}>
              {t("save")}
            </Button>
          ) : null}
        </div>

        {mode === "edit" ? (
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={22}
            className="min-h-[32rem] font-mono text-sm"
            aria-label={t("edit")}
          />
        ) : (
          <article className="mx-auto w-full max-w-3xl space-y-3 rounded-xl border border-foreground/6 bg-card px-8 py-8">
            {preview.map((block, index) => (
              <DocumentBlock
                key={`${block.kind}-${index}`}
                block={block}
                unfilled={t("unfilled")}
              />
            ))}
          </article>
        )}
      </form>

      {earlier.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-xs text-muted-foreground">{t("versions")}</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {earlier.map((version) => (
              <li key={version.savedAt}>{formatSavedAt(version.savedAt)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
