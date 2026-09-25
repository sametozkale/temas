"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { isPropertyRecordPath } from "@/components/properties/property-tabs";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

type Kind =
  | "home"
  | "home-thread"
  | "inbox"
  | "inbox-thread"
  | "calendar"
  | "properties"
  | "property-record"
  | "property-overview"
  | "property-viewings"
  | "property-applications"
  | "property-people"
  | "property-files"
  | "property-activity"
  | "property-wizard"
  | "property-map"
  | "property-edit"
  | "tasks"
  | "settings"
  | "settings-detail"
  | "pipeline"
  | "page";

function tabKind(pathname: string): Kind {
  if (pathname.endsWith("/viewings")) return "property-viewings";
  if (pathname.endsWith("/applications")) return "property-applications";
  if (pathname.endsWith("/people")) return "property-people";
  if (pathname.endsWith("/files") || pathname.endsWith("/inventory")) {
    return "property-files";
  }
  if (pathname.endsWith("/activity")) return "property-activity";
  return "property-overview";
}

function kindFromPath(
  pathname: string,
  threadId: string | null,
  scope: "page" | "tab",
): Kind {
  if (pathname === "/home") return threadId ? "home-thread" : "home";
  if (pathname === "/inbox") return "inbox";
  if (pathname.startsWith("/inbox/")) return "inbox-thread";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/tasks") return "tasks";
  if (pathname === "/pipeline") return "pipeline";
  if (pathname.startsWith("/settings/integrations/")) return "settings-detail";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname === "/properties/new") return "property-wizard";
  if (/^\/properties\/[^/]+\/edit\/?$/.test(pathname)) return "property-edit";
  if (/^\/properties\/[^/]+\/map\/?$/.test(pathname)) return "property-map";
  if (isPropertyRecordPath(pathname)) {
    return scope === "tab" ? tabKind(pathname) : "property-record";
  }
  if (pathname === "/properties") return "properties";
  return "page";
}

function TitleRow({
  action,
  description,
  titleSuffix,
}: {
  action?: boolean;
  description?: boolean;
  titleSuffix?: boolean;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Bar className="h-7 w-36" />
          {titleSuffix ? <Bar className="h-4 w-5" /> : null}
        </div>
        {action ? <Bar className="h-8 w-24 rounded-md" /> : null}
      </div>
      {description ? <Bar className="h-4 w-52" /> : null}
    </header>
  );
}

function HomePending() {
  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <div className="flex flex-col items-center pb-10">
          <Bar className="h-7 w-56" />
          <Bar className="mt-6 h-11 w-full rounded-[22px]" />
        </div>
        <section className="mb-8">
          <Bar className="mb-1 h-4 w-20" />
          <div className="divide-y">
            <div className="flex items-center justify-between py-2">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between py-2">
              <Bar className="h-4 w-48" />
              <Bar className="h-3 w-14" />
            </div>
          </div>
        </section>
        <section>
          <Bar className="mb-2 h-4 w-24" />
          <div className="flex flex-wrap gap-1.5">
            <Bar className="h-6 w-40 rounded-full" />
            <Bar className="h-6 w-48 rounded-full" />
            <Bar className="h-6 w-36 rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}

function HomeThreadPending() {
  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="mb-2 flex h-7 items-center lg:absolute lg:top-3 lg:right-3 lg:left-[18px] lg:z-10 lg:mb-0">
        <Bar className="h-3 w-40" />
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col lg:pt-6">
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          <Bar className="ml-auto h-16 w-[70%] rounded-2xl" />
          <Bar className="h-28 w-[80%] rounded-2xl" />
        </div>
        <div className="sticky bottom-2 pt-2">
          <Bar className="h-11 w-full rounded-[22px]" />
        </div>
      </div>
    </div>
  );
}

function InboxRows() {
  return (
    <div className="flex flex-col gap-px px-2 pb-2">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="rounded-md px-2.5 py-2">
          <div className="flex items-center justify-between gap-3">
            <Bar className={cn("h-4", i % 3 === 0 ? "w-28" : "w-36")} />
            <Bar className="h-3 w-10" />
          </div>
          <Bar className="mt-1.5 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function InboxPending({ thread }: { thread?: boolean }) {
  return (
    <div className="grid h-full min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 flex-col md:border-r",
          thread ? "hidden md:flex" : "flex",
        )}
      >
        <header className="flex h-11 shrink-0 items-center gap-0.5 px-2">
          <Bar className="ml-1.5 h-4 w-14" />
          <div className="ml-auto flex items-center gap-1">
            <Bar className="size-7 rounded-md" />
            <Bar className="size-7 rounded-md" />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <InboxRows />
        </div>
      </aside>
      <section
        className={cn(
          "min-h-0 min-w-0 flex-col overflow-hidden",
          thread ? "flex" : "hidden md:flex",
        )}
      >
        {thread ? (
          <>
            <div className="flex h-11 shrink-0 items-center gap-2 px-3">
              <Bar className="h-4 w-36" />
              <Bar className="ml-auto hidden h-3 w-28 md:block" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
              <Bar className="h-16 w-[70%] rounded-lg" />
              <Bar className="ml-auto h-12 w-[55%] rounded-lg" />
              <Bar className="h-20 w-[65%] rounded-lg" />
            </div>
            <div className="shrink-0 px-3 pb-3">
              <Bar className="h-16 w-full rounded-xl" />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function CalendarPending() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TitleRow />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <Bar className="h-5 w-36" />
          <Bar className="size-7 rounded-md" />
          <Bar className="size-7 rounded-md" />
          <div className="ml-auto flex items-center gap-2">
            <Bar className="h-8 w-32 rounded-md" />
            <Bar className="h-8 w-28 rounded-md" />
            <div className="flex gap-1">
              <Bar className="h-6 w-12 rounded-md" />
              <Bar className="h-6 w-12 rounded-md" />
              <Bar className="h-6 w-10 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-7 border-b">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="px-1.5 py-1.5">
                <Bar className="h-3 w-6" />
              </div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7"
            style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
          >
            {Array.from({ length: 42 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "flex min-h-0 flex-col gap-0.5 overflow-hidden border-b p-1",
                  (i + 1) % 7 !== 0 && "border-r",
                )}
              >
                <Bar className="mb-0.5 size-6 rounded-full" />
                {i % 5 === 0 ? (
                  <Bar className="h-5 w-full rounded-[3px]" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertiesPending() {
  return (
    <div className="space-y-6">
      <TitleRow action titleSuffix />
      <div className="flex h-8 items-center gap-2">
        <Bar className="h-8 w-[200px] max-w-[40%] rounded-md" />
        <Bar className="h-8 w-24 rounded-md" />
        <Bar className="h-8 w-24 rounded-md" />
        <Bar className="h-8 w-28 rounded-md" />
        <Bar className="ml-auto h-8 w-16 rounded-full" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <div className="overflow-hidden rounded-xl border">
              <div className="relative">
                <Bar className="aspect-[4/3] w-full rounded-none" />
                <Bar className="absolute top-2.5 right-2.5 h-5 w-14 rounded-full" />
              </div>
              <div className="space-y-1.5 p-4">
                <Bar className="h-4 w-3/4" />
                <Bar className="h-3 w-1/2" />
                <Bar className="h-3 w-2/5" />
                <div className="flex items-center justify-between pt-1.5">
                  <Bar className="h-4 w-16" />
                  <Bar className="h-3 w-20" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordTabs() {
  return (
    <div className="shrink-0 px-4 pt-5 pb-1">
      <div className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-[3px]">
        {Array.from({ length: 5 }, (_, i) => (
          <Bar
            key={i}
            className={cn(
              "h-[calc(100%-0px)] w-16 rounded-md",
              i === 0 && "bg-background",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function OverviewPending() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Bar key={i} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <Bar className="h-3 w-16" />
            <Bar className="mt-2 h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewingsPending() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border p-4">
          <Bar className="h-4 w-28" />
          <Bar className="h-8 w-full" />
          <Bar className="h-8 w-full" />
          <Bar className="h-8 w-full" />
        </div>
        <div className="grid min-h-[22rem] grid-cols-7 overflow-hidden rounded-xl border">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={cn("min-h-0 border-b p-1", i < 6 && "border-r")}
            >
              <Bar className="mb-2 h-3 w-8" />
              <Bar className="h-16 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApplicationsPending() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 rounded-xl border p-4">
        <Bar className="h-4 w-32" />
        <Bar className="h-9 w-full" />
        <Bar className="h-9 w-2/3" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="w-72 shrink-0 space-y-2 rounded-lg border p-3"
          >
            <Bar className="h-4 w-24" />
            <div className="rounded-md border p-3">
              <Bar className="h-4 w-28" />
              <Bar className="mt-2 h-3 w-36" />
            </div>
            <div className="rounded-md border p-3">
              <Bar className="h-4 w-24" />
              <Bar className="mt-2 h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeoplePending() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border p-4">
          <Bar className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bar className="h-4 w-32" />
            <Bar className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesPending() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Bar className="h-4 w-20" />
        <Bar className="h-8 w-24 rounded-md" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex h-12 items-center gap-3 rounded-lg border px-3"
        >
          <Bar className="size-8 rounded-md" />
          <Bar className="h-4 w-40" />
          <Bar className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function ActivityPending() {
  return (
    <div className="space-y-6">
      <Bar className="h-4 w-64" />
      <div className="space-y-1">
        <Bar className="mx-2 h-3 w-16" />
        <ul className="space-y-1">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-start gap-3 px-2 py-2.5">
              <Bar className="size-8 shrink-0 rounded-full" />
              <Bar className="mt-1 h-4 min-w-0 flex-1" />
              <Bar className="mt-1 h-3 w-14 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RecordPending({ tab }: { tab: Kind }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <Bar className="h-4 w-20" />
        <div className="flex gap-2">
          <Bar className="h-8 w-16 rounded-full" />
          <Bar className="h-8 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="shrink-0 space-y-4 border-b px-5 py-5 lg:w-[340px] lg:border-r lg:border-b-0">
          <Bar className="size-10 rounded-lg" />
          <Bar className="h-6 w-40" />
          <Bar className="h-4 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="h-3.5 w-24" />
                <Bar className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RecordTabs />
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-5">
            <TabPending
              kind={tab === "property-record" ? "property-overview" : tab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPending({ kind }: { kind: Kind }) {
  switch (kind) {
    case "property-viewings":
      return <ViewingsPending />;
    case "property-applications":
      return <ApplicationsPending />;
    case "property-people":
      return <PeoplePending />;
    case "property-files":
      return <FilesPending />;
    case "property-activity":
      return <ActivityPending />;
    default:
      return <OverviewPending />;
  }
}

function WizardPending() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
      <div className="shrink-0 space-y-3 px-1">
        <Bar className="h-1 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-24" />
          <Bar className="h-3 w-12" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-1 py-8">
        <div className="space-y-6">
          <div className="space-y-1">
            <Bar className="h-7 w-64" />
            <Bar className="h-4 w-80" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col items-start gap-2 rounded-xl border px-3 py-3"
              >
                <Bar className="size-5" />
                <Bar className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPending() {
  return (
    <div className="flex min-h-full flex-col">
      <Bar className="mb-6 h-4 w-20" />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-3xl">
          <Bar className="mx-auto h-24 w-56 rounded-xl border border-dashed bg-transparent" />
          <div className="mt-8 grid grid-cols-3 gap-4">
            <Bar className="h-20 rounded-xl border border-dashed bg-transparent" />
            <Bar className="h-20 rounded-xl border border-dashed bg-transparent" />
            <Bar className="h-20 rounded-xl border border-dashed bg-transparent" />
          </div>
          <div className="mt-10 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Bar
                key={i}
                className="h-28 rounded-xl border border-dashed bg-transparent"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPending() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <Bar className="h-4 w-24" />
      <TitleRow />
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksPending() {
  return (
    <div className="space-y-4">
      <TitleRow action />
      <div className="flex items-center gap-1 border-b">
        {["w-10", "w-16", "w-20"].map((width) => (
          <div key={width} className="flex h-9 items-center px-2.5">
            <Bar className={cn("h-3.5", width)} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }, (_, g) => (
          <section key={g}>
            <div className="flex h-9 items-center gap-2 rounded-lg bg-muted/70 px-3">
              <Bar className="size-3.5" />
              <Bar className="h-3.5 w-36" />
              <Bar className="h-3 w-5" />
            </div>
            <div className="flex flex-col gap-0.5 pt-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="flex h-10 items-center gap-2 rounded-md px-3"
                >
                  <Bar className="size-4 rounded-[4px]" />
                  <Bar className="h-4 w-48" />
                  <Bar className="ml-auto size-[18px] rounded-full" />
                  <Bar className="h-3 w-12" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SettingsPending({ detail }: { detail?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="flex flex-col gap-3">
        {detail ? <Bar className="h-3 w-24" /> : null}
        <Bar className="h-8 w-40" />
      </header>
      {Array.from({ length: 2 }, (_, g) => (
        <section key={g} className="space-y-2">
          <Bar className="h-4 w-24" />
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border p-4"
            >
              <Bar className="size-10 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bar className="h-4 w-32" />
                <Bar className="h-3 w-48" />
              </div>
              <Bar className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function PipelinePending() {
  return (
    <div className="space-y-6">
      <TitleRow description />
      <ul className="divide-y rounded-lg border">
        {Array.from({ length: 5 }, (_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <Bar className="h-4 w-40" />
            <Bar className="h-5 w-10 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GenericPending() {
  return (
    <div className="space-y-6">
      <TitleRow description />
      <div className="space-y-3">
        <Bar className="h-4 w-full max-w-md" />
        <Bar className="h-4 w-2/3 max-w-sm" />
        <Bar className="h-4 w-1/2 max-w-xs" />
      </div>
    </div>
  );
}

function PendingFrame({ kind }: { kind: Kind }) {
  switch (kind) {
    case "home":
      return <HomePending />;
    case "home-thread":
      return <HomeThreadPending />;
    case "inbox":
      return <InboxPending />;
    case "inbox-thread":
      return <InboxPending thread />;
    case "calendar":
      return <CalendarPending />;
    case "properties":
      return <PropertiesPending />;
    case "property-record":
      return <RecordPending tab="property-overview" />;
    case "property-overview":
    case "property-viewings":
    case "property-applications":
    case "property-people":
    case "property-files":
    case "property-activity":
      return <TabPending kind={kind} />;
    case "property-wizard":
      return <WizardPending />;
    case "property-map":
      return <MapPending />;
    case "property-edit":
      return <EditPending />;
    case "tasks":
      return <TasksPending />;
    case "settings":
      return <SettingsPending />;
    case "settings-detail":
      return <SettingsPending detail />;
    case "pipeline":
      return <PipelinePending />;
    default:
      return <GenericPending />;
  }
}

function CanvasPendingInner({ scope }: { scope: "page" | "tab" }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  // `useSearchParams` suspends. This component is the `loading.tsx` fallback,
  // so a second boundary hydrates as an empty box against the shell.
  const [threadId, setThreadId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("thread");
    setThreadId(id);
  }, [pathname]);
  const kind = kindFromPath(pathname, threadId, scope);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <span className="sr-only">{t("loading")}</span>
      {kind === "property-record" ? (
        <RecordPending tab={tabKind(pathname)} />
      ) : (
        <PendingFrame kind={kind} />
      )}
    </div>
  );
}

/**
 * Quiet in-canvas placeholder that follows the destination chrome
 * (docs/01: no illustrations, no spinner, plain pulse).
 */
export function CanvasPending({ scope = "page" }: { scope?: "page" | "tab" }) {
  return <CanvasPendingInner scope={scope} />;
}

/** @deprecated Use CanvasPending. Kept so older imports keep compiling. */
export function PagePending({
  variant = "page",
}: {
  label?: string;
  variant?: "page" | "inbox" | "record";
}) {
  const scope = variant === "record" ? "tab" : "page";
  return <CanvasPending scope={scope} />;
}
