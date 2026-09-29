import { getTranslations } from "next-intl/server";

import {
  AlertCircleIcon,
  Building03Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  File01Icon,
  Folder01Icon,
  Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

import { Bar, Card, Check, Window, buildSteps } from "./frame";

const TEMPLATES = ["tpl_1", "tpl_2", "tpl_3", "tpl_4", "tpl_5", "tpl_6"] as const;

async function Templates() {
  const t = await getTranslations("marketing.features.contracts.screen");
  return (
    <Window
      title={t("create_title")}
      aside={
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon icon={Building03Icon} size={16} className="size-3.5" />
          {t("riverside")}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        {TEMPLATES.map((key, index) => (
          <div
            key={key}
            className={cn(
              "rounded-xl border p-3",
              index === 2 ? "border-foreground bg-card" : "border-foreground/8 bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                index === 2 ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon icon={File01Icon} size={16} />
            </span>
            <p className="mt-3 text-xs leading-snug font-medium">{t(key)}</p>
            <Bar className="mt-2 w-3/4" />
          </div>
        ))}
      </div>
    </Window>
  );
}

async function Facts() {
  const t = await getTranslations("marketing.features.contracts.screen");
  const facts = [
    { key: "fact_owner", ok: true },
    { key: "fact_tenant", ok: true },
    { key: "fact_address", ok: true },
    { key: "fact_rent", ok: true },
    { key: "fact_deposit", ok: false },
    { key: "fact_start", ok: false },
  ] as const;
  return (
    <Window title={t("facts_title")} aside={<span className="text-xs text-muted-foreground">{t("tpl_3")}</span>}>
      <ul className="divide-y divide-foreground/6 px-4">
        {facts.map((fact) => (
          <li key={fact.key} className="flex h-11 items-center gap-3 text-sm">
            <Icon
              icon={fact.ok ? CheckmarkCircle02Icon : AlertCircleIcon}
              size={16}
              className={fact.ok ? "text-brand" : "text-warning"}
            />
            <span className="w-28 shrink-0 text-muted-foreground">{t(`${fact.key}_label`)}</span>
            <span className={cn("min-w-0 flex-1 truncate", fact.ok ? "" : "text-warning-foreground")}>
              {t(fact.key)}
            </span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

async function Terms() {
  const t = await getTranslations("marketing.features.contracts.screen");
  const fields = [
    { key: "term_rent", empty: false },
    { key: "term_deposit", empty: false },
    { key: "term_start", empty: true },
    { key: "term_end", empty: true },
    { key: "term_increase", empty: false },
  ] as const;
  return (
    <Window title={t("terms_title")}>
      <div className="grid grid-cols-2 gap-2.5 p-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className={cn(
              "rounded-lg border border-foreground/10 bg-card px-3 py-2",
              field.key === "term_increase" && "col-span-2 sm:col-span-1",
            )}
          >
            <p className="text-[11px] text-muted-foreground">{t(`${field.key}_label`)}</p>
            <p className={cn("text-sm tabular-nums", field.empty && "text-muted-foreground/70")}>
              {t(field.key)}
            </p>
          </div>
        ))}
        <div className="col-span-2 rounded-lg border border-foreground/10 bg-card px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{t("term_clauses_label")}</p>
          <p className="text-sm">{t("term_clauses")}</p>
        </div>
        <span className="col-span-2 mt-1 flex h-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {t("generate")}
        </span>
      </div>
    </Window>
  );
}

async function Draft() {
  const t = await getTranslations("marketing.features.contracts.screen");
  return (
    <Card>
      <article className="space-y-3 px-5 py-5 sm:px-8">
        <div className="inline-flex h-8 items-center rounded-full bg-muted p-0.5">
          <span className="flex h-7 items-center rounded-full bg-card px-3 text-xs">{t("doc_document")}</span>
          <span className="flex h-7 items-center rounded-full px-3 text-xs text-muted-foreground">{t("doc_edit")}</span>
        </div>
        <p className="font-serif text-xl font-medium tracking-tight">{t("tpl_3")}</p>
        <p className="text-xs font-medium">{t("doc_h_parties")}</p>
        <p className="text-sm leading-6">{t("doc_parties")}</p>
        <p className="text-xs font-medium">{t("doc_h_rent")}</p>
        <p className="text-sm leading-6">
          {t("doc_rent_lead")}{" "}
          <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 align-baseline text-xs text-muted-foreground">
            {t("doc_chip")}
          </span>
          {`, ${t("doc_rent")}`}
        </p>
        <p className="text-sm leading-6">{t("doc_clause")}</p>
        <div className="space-y-1.5 pt-1">
          <Bar className="w-full" />
          <Bar className="w-11/12" />
          <Bar className="w-3/5" />
        </div>
      </article>
    </Card>
  );
}

async function Export() {
  const t = await getTranslations("marketing.features.contracts.screen");
  return (
    <div className="space-y-3">
      <Card className="px-5 py-4 opacity-70">
        <p className="font-serif text-lg tracking-tight">{t("tpl_3")}</p>
        <div className="mt-2 space-y-1.5">
          <Bar className="w-full" />
          <Bar className="w-4/5" />
        </div>
      </Card>
      <Card className="p-4">
        <p className="text-sm font-medium">{t("disclaimer_title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("disclaimer_body")}</p>
        <p className="mt-3 flex items-center gap-2.5 text-sm">
          <Check on />
          {t("disclaimer_check")}
        </p>
        <div className="mt-4 flex gap-2 border-t border-foreground/6 pt-4">
          <span className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs text-primary-foreground">
            <Icon icon={Download01Icon} size={16} className="size-3.5" />
            {t("export_docx")}
          </span>
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-foreground/12 px-3.5 text-xs">
            <Icon icon={Download01Icon} size={16} className="size-3.5" />
            {t("export_pdf")}
          </span>
        </div>
      </Card>
    </div>
  );
}

async function Files() {
  const t = await getTranslations("marketing.features.contracts.screen");
  const files = [
    { key: "file_docx", fresh: true },
    { key: "file_pdf", fresh: true },
    { key: "file_other_1", fresh: false },
    { key: "file_other_2", fresh: false },
  ] as const;
  const tabs = ["tab_overview", "tab_people", "tab_viewings", "tab_files"] as const;
  return (
    <Card>
      <div className="px-4 pt-4">
        <p className="font-serif text-lg tracking-tight">{t("riverside")}</p>
        <div className="mt-3 flex gap-4 border-b border-foreground/6 text-xs">
          {tabs.map((key) => (
            <span
              key={key}
              className={cn(
                "-mb-px border-b pb-2",
                key === "tab_files" ? "border-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {t(key)}
            </span>
          ))}
        </div>
      </div>
      <ul className="p-2">
        {files.map((file) => (
          <li
            key={file.key}
            className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5", file.fresh && "bg-brand-soft/50")}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon icon={file.fresh ? File01Icon : Folder01Icon} size={16} />
            </span>
            {file.fresh ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t(file.key)}</span>
                <span className="block text-[11px] text-muted-foreground">{t("file_meta")}</span>
              </span>
            ) : (
              <span className="flex-1 space-y-1.5">
                <Bar className="w-1/2" />
                <Bar className="w-1/4" />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t border-foreground/6 px-4 py-3 text-[11px] text-muted-foreground">{t("no_esign")}</p>
    </Card>
  );
}

export function contractsSteps() {
  return buildSteps("contracts", [
    <Templates key="1" />,
    <Facts key="2" />,
    <Terms key="3" />,
    <Draft key="4" />,
    <Export key="5" />,
    <Files key="6" />,
  ]);
}
