"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { EmailFrame } from "@/components/inbox/email-frame";
import { Button } from "@/components/ui/button";
import {
  messageSnippet,
  splitQuotedHtml,
  splitQuotedText,
} from "@/lib/inbox/email-html";
import { formatDateTime } from "@/lib/format";
import { parseFromHeader } from "@/lib/inbox/match";
import { cn } from "@/lib/utils";

type EmailMessage = {
  id: string;
  direction: "in" | "out";
  body: string | null;
  bodyHtml: string | null;
  from: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
};

export function EmailThread({
  subject,
  contactName,
  messages,
}: {
  subject: string | null;
  contactName: string;
  messages: EmailMessage[];
}) {
  const t = useTranslations("inbox");
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const latestRef = React.useRef<HTMLLIElement>(null);
  const latest = messages[messages.length - 1]?.id;
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(latest ? [latest] : []),
  );
  const [quotes, setQuotes] = React.useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  React.useLayoutEffect(() => {
    const node = latestRef.current;
    const scroller = scrollerRef.current;
    if (!node || !scroller || messages.length < 2) return;
    const top =
      node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (top > scroller.clientHeight - 72) scroller.scrollTop += top;
  }, [messages.length]);

  function toggleQuote(id: string) {
    setQuotes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
      {subject ? (
        <p className="px-5 pt-4 text-sm font-medium">{subject}</p>
      ) : null}
      <ol className={cn("flex flex-col px-3", subject ? "pt-2" : "py-2")}>
        {messages.map((message) => {
          const expanded = open.has(message.id);
          const outbound = message.direction === "out";
          const parsed = message.from ? parseFromHeader(message.from) : null;
          const sender = outbound
            ? t("you")
            : (parsed?.name ?? parsed?.email ?? contactName);
          const when = message.sentAt ?? message.createdAt;
          const htmlParts = message.bodyHtml
            ? splitQuotedHtml(message.bodyHtml)
            : null;
          const textParts = message.bodyHtml
            ? null
            : splitQuotedText(message.body ?? "");
          const snippet = messageSnippet(message.body, message.bodyHtml);
          const quoted = htmlParts?.quoted ?? textParts?.quoted ?? null;
          const quoteOpen = quotes.has(message.id);

          return (
            <li
              key={message.id}
              ref={message.id === latest ? latestRef : undefined}
              className="border-b border-foreground/6 last:border-b-0"
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle(message.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted/70",
                  expanded && "sticky top-0 z-10 bg-card",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {sender}
                    </span>
                    <time
                      dateTime={new Date(when).toISOString()}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    >
                      {formatDateTime(when)}
                    </time>
                  </span>
                  {expanded ? null : (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {snippet}
                    </span>
                  )}
                </span>
              </button>
              {expanded ? (
                <div className="px-2 pb-4">
                  {htmlParts ? (
                    <EmailFrame
                      html={htmlParts.fresh}
                      title={t("email_body")}
                    />
                  ) : (
                    <p className="text-sm wrap-break-word whitespace-pre-wrap">
                      {textParts?.fresh ?? ""}
                    </p>
                  )}
                  {quoted ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        aria-expanded={quoteOpen}
                        onClick={() => toggleQuote(message.id)}
                      >
                        {quoteOpen ? t("hide_trimmed") : t("show_trimmed")}
                      </Button>
                      {quoteOpen ? (
                        htmlParts?.quoted ? (
                          <EmailFrame
                            html={htmlParts.quoted}
                            title={t("trimmed_content")}
                          />
                        ) : (
                          <p className="mt-2 text-sm wrap-break-word whitespace-pre-wrap text-muted-foreground">
                            {textParts?.quoted}
                          </p>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
