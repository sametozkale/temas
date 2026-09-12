import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ReplyComposer } from "@/components/inbox/reply-composer";
import { formatDateTime } from "@/lib/format";
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
}: {
  conversationId: string;
  subject: string | null;
  contactName: string | null;
  contactEmail: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  messages: ThreadMessage[];
  canReply: boolean;
}) {
  const t = await getTranslations("inbox");
  const title = contactName ?? contactEmail ?? t("unknown_contact");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {subject ?? t("no_subject")}
        </p>
        {propertyId && propertyTitle ? (
          <Link
            href={`/properties/${propertyId}`}
            className="mt-1 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {propertyTitle}
          </Link>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("unlinked_property")}
          </p>
        )}
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
                  "max-w-[85%] rounded-lg border px-3 py-2",
                  outbound ? "bg-secondary" : "bg-card",
                )}
              >
                <p className="text-sm whitespace-pre-wrap">
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
        <ReplyComposer conversationId={conversationId} />
      ) : (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {t("errors.forbidden")}
        </p>
      )}
    </div>
  );
}
