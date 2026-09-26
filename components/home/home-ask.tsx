"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isFileUIPart, isTextUIPart } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { ThreadMenu } from "@/components/home/thread-menu";
import { MessageBody } from "@/components/home/message-body";
import { PromptBar, toFileList } from "@/components/prompt-bar";
import { GoogleEventDialog } from "@/components/calendar/google-event-dialog";
import { File01Icon, Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AskUIMessage } from "@/lib/ai/types";
import {
  classifyHref,
  mentionHrefs,
  parseMentions,
  type AskEntity,
} from "@/lib/ai/mentions";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport<AskUIMessage>({
  api: "/api/ai/chat",
});

const EVENT_WASHES = [
  "bg-brand-soft text-brand-foreground hover:bg-brand-soft",
  "bg-info-soft text-info hover:bg-info-soft",
  "bg-warning-soft text-warning hover:bg-warning-soft",
  "bg-success-soft text-success hover:bg-success-soft",
] as const;

function eventWash(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) {
    n = (n + id.charCodeAt(i) * (i + 1)) % EVENT_WASHES.length;
  }
  return EVENT_WASHES[n];
}

const DOCK_MS = 400;
const DOCK_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mergeEntities(
  catalog: AskEntity[],
  sources: AskUIMessage["parts"],
): AskEntity[] {
  const extra: AskEntity[] = [];
  for (const part of sources) {
    if (part.type !== "data-source") continue;
    const classified = classifyHref(part.data.href);
    extra.push({
      kind: part.data.kind,
      id: classified?.id ?? part.data.href,
      title: part.data.title,
      href: part.data.href,
      matchName: true,
    });
  }
  return extra.length > 0 ? [...catalog, ...extra] : catalog;
}

function sourceNotInlined(href: string, inlined: Set<string>) {
  if (inlined.has(href)) return false;
  for (const chip of inlined) {
    if (
      href === chip ||
      href.startsWith(`${chip}/`) ||
      chip.startsWith(`${href}/`)
    ) {
      return false;
    }
  }
  return true;
}

export function HomeAsk({
  greeting,
  configured = true,
  suggestions = [],
  calendar = null,
  threadId = null,
  threadTitle = null,
  initialMessages = [],
  entities = [],
  children,
}: {
  greeting: string;
  configured?: boolean;
  suggestions?: string[];
  calendar?: {
    todayLabel: string;
    today: {
      id: string;
      time: string;
      title: string;
      day: string;
      href: string;
      google: {
        when: string;
        location: string | null;
        calendarName: string;
        description: string | null;
        meetUrl: string | null;
        htmlUrl: string | null;
        guests: {
          email: string;
          name: string | null;
          response: "accepted" | "declined" | "tentative" | "needsAction";
          organizer: boolean;
          self: boolean;
        }[];
      } | null;
    }[];
  } | null;
  threadId?: string | null;
  threadTitle?: string | null;
  initialMessages?: AskUIMessage[];
  entities?: AskEntity[];
  children?: React.ReactNode;
}) {
  const t = useTranslations("home");
  const router = useRouter();
  const [openEventId, setOpenEventId] = React.useState<string | null>(null);
  const threadIdRef = React.useRef<string | null>(threadId);
  const barRef = React.useRef<HTMLDivElement>(null);
  const firstRectRef = React.useRef<DOMRect | null>(null);
  const pendingNavRef = React.useRef(false);
  const bubblesReadyRef = React.useRef(
    Boolean(threadId) || initialMessages.length > 0,
  );
  const dockedFromLandingRef = React.useRef(false);
  const seenIdsRef = React.useRef(new Set(initialMessages.map((m) => m.id)));
  const [started, setStarted] = React.useState(false);
  const [bubblesReady, setBubblesReady] = React.useState(
    bubblesReadyRef.current,
  );
  const [liveTitle, setLiveTitle] = React.useState<string | null>(
    threadTitle?.trim() || null,
  );
  const [savedId, setSavedId] = React.useState<string | null>(threadId);
  const { messages, sendMessage, status } = useChat<AskUIMessage>({
    id: threadId ?? "new",
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-thread") {
        threadIdRef.current = part.data.id;
        setSavedId(part.data.id);
        if (part.data.title?.trim()) setLiveTitle(part.data.title.trim());
      }
    },
    onFinish: () => {
      pendingNavRef.current = true;
      if (bubblesReadyRef.current && !dockedFromLandingRef.current) {
        flushNav();
      }
    },
    onError: (error) => {
      const message = error.message.toLowerCase();
      if (message.includes("429") || message.includes("quota")) {
        toast.error(t("quota_exhausted"));
        return;
      }
      toast.error(t("ask_error"));
    },
  });

  function flushNav() {
    if (!pendingNavRef.current) return;
    pendingNavRef.current = false;
    const id = threadIdRef.current;
    if (id && id !== threadId) {
      router.replace(`/home?thread=${id}`, { scroll: false });
    }
    router.refresh();
  }

  function revealBubbles() {
    const holdNav = dockedFromLandingRef.current;
    dockedFromLandingRef.current = false;
    bubblesReadyRef.current = true;
    setBubblesReady(true);
    if (!pendingNavRef.current) return;
    if (holdNav) {
      window.setTimeout(flushNav, 320);
      return;
    }
    flushNav();
  }

  const busy = status === "submitted" || status === "streaming";
  const inThread = Boolean(threadId) || messages.length > 0 || started;
  const title = liveTitle ?? threadTitle?.trim() ?? null;
  const endRef = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    const next = threadTitle?.trim() || null;
    if (next) setLiveTitle(next);
  }, [threadTitle]);

  React.useEffect(() => {
    if (threadId) setSavedId(threadId);
  }, [threadId]);

  React.useLayoutEffect(() => {
    if (!inThread) return;
    const first = firstRectRef.current;
    const el = barRef.current;
    if (!first || !el) {
      if (!bubblesReadyRef.current) revealBubbles();
      return;
    }
    const dy = first.top - el.getBoundingClientRect().top;
    if (Math.abs(dy) < 1) {
      firstRectRef.current = null;
      revealBubbles();
      return;
    }
    el.style.transition = "none";
    el.style.transform = `translateY(${dy}px)`;
    void el.offsetWidth;
    el.style.transition = `transform ${DOCK_MS}ms ${DOCK_EASE}`;
    el.style.transform = "translateY(0)";
    const finish = (event?: TransitionEvent) => {
      if (
        event &&
        (event.target !== el || event.propertyName !== "transform")
      ) {
        return;
      }
      firstRectRef.current = null;
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("transitionend", finish);
      window.clearTimeout(fallback);
      revealBubbles();
    };
    el.addEventListener("transitionend", finish);
    const fallback = window.setTimeout(() => finish(), DOCK_MS + 50);
    return () => {
      window.clearTimeout(fallback);
      el.removeEventListener("transitionend", finish);
      el.style.transition = "";
      el.style.transform = "";
    };
  }, [inThread]);

  React.useEffect(() => {
    if (!bubblesReady) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, bubblesReady]);

  async function ask(value: string, files: File[] = []) {
    if (!inThread) {
      setStarted(true);
      if (!prefersReducedMotion() && barRef.current) {
        firstRectRef.current = barRef.current.getBoundingClientRect();
        dockedFromLandingRef.current = true;
        bubblesReadyRef.current = false;
        setBubblesReady(false);
      } else {
        revealBubbles();
      }
    }
    const text =
      value.trim() ||
      (files.length > 0 ? t("attached_files", { count: files.length }) : "");
    if (!text) return;
    await sendMessage(
      files.length > 0 ? { text, files: toFileList(files) } : { text },
      { body: { threadId: threadIdRef.current } },
    );
  }

  const prompt = (
    <div
      ref={barRef}
      className={inThread ? "sticky bottom-2 pt-2" : "mt-6 w-full"}
    >
      <PromptBar
        placeholder={t("prompt_placeholder")}
        examples={[
          t("suggestion_viewings"),
          t("suggestion_pipeline"),
          t("suggestion_deposit"),
          t("suggestion_calendar"),
          t("suggestion_tasks"),
        ]}
        disabled={busy}
        onSubmit={ask}
      />
    </div>
  );

  if (inThread) {
    const visible = bubblesReady ? messages : [];
    return (
      <div className="flex min-h-full w-full flex-col">
        <header className="mb-2 flex h-7 items-center gap-2 lg:absolute lg:top-3 lg:right-3 lg:left-[18px] lg:z-10 lg:mb-0">
          <h1
            aria-live="polite"
            className="min-w-0 flex-1 truncate text-xs font-medium tracking-tight text-muted-foreground"
          >
            {title}
          </h1>
          {savedId ? (
            <ThreadMenu
              threadId={savedId}
              title={title}
              onRenamed={setLiveTitle}
            />
          ) : null}
        </header>
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col lg:pt-6">
          <ol className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            {visible.map((message) => {
              const text = message.parts
                .filter(isTextUIPart)
                .map((part) => part.text)
                .join("\n");
              const sources = message.parts.filter(
                (part) => part.type === "data-source",
              );
              const files = message.parts.filter(isFileUIPart);
              const outbound = message.role === "user";
              const waiting = busy && !outbound && !text;
              const rise = outbound && !seenIdsRef.current.has(message.id);
              const messageEntities = mergeEntities(entities, message.parts);
              const inlined = mentionHrefs(
                parseMentions(text, messageEntities),
              );
              const extraSources = sources.filter((part) =>
                sourceNotInlined(part.data.href, inlined),
              );
              return (
                <li
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1.5",
                    outbound ? "items-end" : "items-start",
                    rise &&
                      "motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-8",
                  )}
                >
                  {files.length > 0 ? (
                    <ul className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
                      {files.map((part) => (
                        <li key={`${part.filename}-${part.url.slice(-12)}`}>
                          {part.mediaType.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={part.url}
                              alt={
                                part.filename ??
                                t("attached_files", { count: 1 })
                              }
                              className="h-14 max-w-[120px] rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-9 max-w-[160px] items-center gap-1.5 rounded-xl border border-border bg-secondary px-2.5 text-xs font-medium">
                              <Icon
                                icon={File01Icon}
                                size={16}
                                className="shrink-0 text-muted-foreground"
                              />
                              <span className="truncate">
                                {part.filename ?? "File"}
                              </span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div
                    role="article"
                    aria-label={outbound ? t("you") : t("assistant")}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 whitespace-pre-wrap",
                      outbound
                        ? "bg-brand-soft text-brand-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {waiting ? (
                      <span
                        aria-hidden
                        className="mt-1.5 inline-block size-1.5 animate-pulse rounded-full bg-current opacity-40"
                      />
                    ) : (
                      <MessageBody text={text} entities={messageEntities} />
                    )}
                  </div>
                  {extraSources.length > 0 ? (
                    <div className="flex max-w-[85%] flex-wrap gap-1.5">
                      {extraSources.map((part) => (
                        <Badge
                          key={`${part.data.href}-${part.data.title}`}
                          variant="outline"
                          asChild
                        >
                          <Link href={part.data.href}>{part.data.title}</Link>
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
            <li ref={endRef} className="h-px" aria-hidden />
          </ol>
          {prompt}
        </div>
      </div>
    );
  }

  const openEvent =
    calendar?.today.find((event) => event.id === openEventId) ?? null;

  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <div className="flex flex-col items-center pb-10">
          <h1 className="text-center font-serif text-xl font-medium tracking-tight">
            {greeting}
          </h1>
          {!configured ? (
            <Badge variant="warning" className="mt-3">
              {t("not_configured")}
            </Badge>
          ) : null}
          {prompt}
        </div>
        {children}
        {calendar || suggestions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {suggestions.length > 0 ? (
              <section>
                <h2 className="mb-2 text-xs text-muted-foreground">
                  {t("suggestions_title")}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="pill"
                      size="xs"
                      disabled={busy}
                      onClick={() => void ask(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}
            {calendar && calendar.today.length > 0 ? (
              <section className="mt-4">
                <h2 className="mb-2 text-xs text-muted-foreground">
                  {calendar.todayLabel}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {calendar.today.map((event) => {
                    const chipClass = cn(
                      "max-w-full hover:brightness-[0.97]",
                      eventWash(event.id),
                    );
                    const body = (
                      <>
                        <span className="shrink-0 tabular-nums opacity-70">
                          {event.time}
                        </span>
                        <span className="truncate font-medium">{event.title}</span>
                      </>
                    );
                    if (event.google) {
                      return (
                        <Button
                          key={event.id}
                          type="button"
                          variant="pill"
                          size="xs"
                          title={`${event.time} ${event.title}`}
                          className={chipClass}
                          onClick={() => setOpenEventId(event.id)}
                        >
                          {body}
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={event.id}
                        variant="pill"
                        size="xs"
                        className={chipClass}
                        asChild
                      >
                        <Link
                          href={event.href}
                          title={`${event.time} ${event.title}`}
                        >
                          {body}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            <GoogleEventDialog
              open={Boolean(openEvent)}
              onOpenChange={(open) => {
                if (!open) setOpenEventId(null);
              }}
              event={
                openEvent?.google
                  ? {
                      title: openEvent.title,
                      when: openEvent.google.when,
                      day: openEvent.day,
                      location: openEvent.google.location,
                      calendarName: openEvent.google.calendarName,
                      description: openEvent.google.description,
                      meetUrl: openEvent.google.meetUrl,
                      htmlUrl: openEvent.google.htmlUrl,
                      guests: openEvent.google.guests,
                    }
                  : null
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
