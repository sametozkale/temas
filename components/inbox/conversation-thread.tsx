import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ReplyComposer } from "@/components/inbox/reply-composer";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { DraftTone } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ThreadMessage = {
  id: string;
  direction: "in" | "out";
  body: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export async function ConversationThread({
  conversationId,
  subject,
  contactName,
  contactEmail,
  propertyId,
  propertyTitle,
  messages,
  canReply,
  canDraft,
  defaultTone,
}: {
  conversationId: string;
  subject: string | null;
  contactName: string | null;
  contactEmail: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  messages: ThreadMessage[];
  canReply: boolean;
  canDraft: boolean;
  defaultTone: DraftTone;
}) {
  const t = await getTranslations("inbox");
  const title = contactName ?? contactEmail ?? t("unknown_contact");

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center gap-2 px-3">
        <Button variant="ghost" size="sm" asChild className="md:hidden">
          <Link href="/inbox">{t("back")}</Link>
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        {propertyId && propertyTitle ? (
          <Link
            href={`/properties/${propertyId}`}
            className="hidden max-w-[40%] truncate text-xs text-muted-foreground underline-offset-4 hover:underline md:inline"
          >
            {propertyTitle}
          </Link>
        ) : subject ? (
          <p className="hidden max-w-[40%] truncate text-xs text-muted-foreground md:block">
            {subject}
          </p>
        ) : null}
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.map((message) => {
          const outbound = message.direction === "out";
          const when = message.sentAt ?? message.createdAt;
          return (
            <li
              key={message.id}
              className={cn("flex", outbound ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "min-w-0 max-w-[85%] rounded-lg border px-3 py-2",
                  outbound ? "bg-secondary" : "bg-card",
                )}
              >
                <p className="text-sm wrap-break-word whitespace-pre-wrap">
                  {message.body ?? ""}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {outbound ? t("you") : title} · {formatDateTime(when)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
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
