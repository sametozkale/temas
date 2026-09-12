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
import { markdownToBlocks } from "@/lib/contracts/markdown";

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
  const [ack, setAck] = React.useState(acknowledged);
  const [exporting, setExporting] = React.useState<"docx" | "pdf" | null>(null);
  const [state, action, pending] = useActionState<
    ContractState | undefined,
    FormData
  >(saveContractBody, undefined);

  React.useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);

  const preview = markdownToBlocks(body);

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
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="space-y-3">
        <input type="hidden" name="contractId" value={contractId} />
        <Textarea
          name="bodyMd"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={22}
          className="font-mono text-sm"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {t("save")}
        </Button>
      </form>
      <div className="space-y-4">
        <div className="rounded-lg border bg-warning-soft p-4 text-sm text-warning-foreground">
          {t("disclaimer")}
        </div>
        <Field orientation="horizontal">
          <Checkbox
            id="disclaimer"
            checked={ack}
            onCheckedChange={(value) => void onAck(value === true)}
          />
          <FieldLabel htmlFor="disclaimer">{t("acknowledge")}</FieldLabel>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
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
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">{t("preview")}</h3>
          {preview.map((block, index) =>
            block.kind === "p" ? (
              <p key={`${block.text}-${index}`} className="text-sm">
                {block.text}
              </p>
            ) : (
              <p
                key={`${block.text}-${index}`}
                className={
                  block.kind === "h1"
                    ? "font-serif text-xl"
                    : "text-sm font-medium"
                }
              >
                {block.text}
              </p>
            ),
          )}
        </div>
        {versions.length > 1 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("versions")}</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {versions
                .slice()
                .reverse()
                .slice(0, 8)
                .map((version) => (
                  <li key={version.savedAt}>{version.savedAt}</li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
