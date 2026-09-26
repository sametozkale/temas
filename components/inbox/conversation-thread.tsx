import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmailFrame } from "@/components/inbox/email-frame";
import { EmailThread } from "@/components/inbox/email-thread";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { ThreadActions } from "@/components/inbox/thread-actions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { DraftTone } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ThreadMessage = {
  id: string;
  direction: "in" | "out";
  body: string | null;
  bodyHtml: string | null;
  from: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export async function ConversationThread({
  conversationId,
  subject,
  channel,
  contactName,
  contactEmail,
  propertyId,
  propertyTitle,
  messages,
  canReply,
  canDraft,
  canManage,
  starred,
  defaultTone,
}: {
  conversationId: string;
  subject: string | null;
  channel: "email" | "whatsapp";
  contactName: string | null;
  contactEmail: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  messages: ThreadMessage[];
  canReply: boolean;
  canDraft: boolean;
  canManage: boolean;
  starred: boolean;
  defaultTone: DraftTone;
}) {
  const t = await getTranslations("inbox");
  const title = contactName ?? contactEmail ?? t("unknown_contact");

  const emailSubject = channel === "email" ? subject : null;
  const showActions = channel === "email" && canManage;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex h-11 items-center gap-2",
              showActions ? "pr-2 pl-3" : "px-3",
            )}
          >
            <Button variant="ghost" size="sm" asChild className="md:hidden">
              <Link href="/inbox">{t("back")}</Link>
            </Button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
            {propertyId && propertyTitle ? (
              <Link
                href={`/properties/${propertyId}`}
                className="hidden max-w-[30%] truncate text-xs text-muted-foreground underline-offset-4 hover:underline md:inline"
              >
                {propertyTitle}
              </Link>
            ) : channel !== "email" && subject ? (
              <p className="hidden max-w-[40%] truncate text-xs text-muted-foreground md:block">
                {subject}
              </p>
            ) : null}
          </div>
          {emailSubject ? (
            <p
              className={cn(
                "-mt-3 truncate pb-2 text-xs text-muted-foreground",
                showActions ? "pr-2 pl-3" : "px-3",
              )}
            >
              {emailSubject}
            </p>
          ) : null}
        </div>
        {showActions ? (
          <div className="flex h-11 shrink-0 items-center pr-3">
            <ThreadActions conversationId={conversationId} starred={starred} />
          </div>
        ) : null}
      </div>
      {channel === "email" ? (
        <EmailThread contactName={title} messages={messages} />
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.map((message) => {
            const outbound = message.direction === "out";
            const when = message.sentAt ?? message.createdAt;
            const html = !outbound ? message.bodyHtml : null;
            return (
              <li
                key={message.id}
                className={cn(
                  "flex",
                  html ? "w-full" : outbound ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "min-w-0 overflow-hidden rounded-lg border",
                    html ? "w-full bg-card" : "max-w-[85%] px-3 py-2",
                    !html && (outbound ? "bg-secondary" : "bg-card"),
                  )}
                >
                  {html ? (
                    <EmailFrame html={html} title={t("email_body")} />
                  ) : (
                    <p className="text-sm wrap-break-word whitespace-pre-wrap">
                      {message.body ?? ""}
                    </p>
                  )}
                  <p
                    className={cn(
                      "text-[11px] text-muted-foreground",
                      html ? "px-3 py-2" : "mt-1",
                    )}
                  >
                    {outbound ? t("you") : title} · {formatDateTime(when)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {canReply ? (
        <ReplyComposer
          conversationId={conversationId}
          defaultTone={defaultTone}
          canDraft={canDraft}
        />
      ) : (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {t("errors.forbidden")}
        </p>
      )}
    </div>
  );
}
