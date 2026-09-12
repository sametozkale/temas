"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { PromptBar } from "@/components/prompt-bar";
import { Badge } from "@/components/ui/badge";
import type { AskUIMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport<AskUIMessage>({
  api: "/api/ai/chat",
});

export function HomeAsk({ suggestion }: { suggestion: string }) {
  const t = useTranslations("home");
  const threadIdRef = React.useRef<string | null>(null);
  const { messages, sendMessage, status } = useChat<AskUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-thread") {
        threadIdRef.current = part.data.id;
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
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="mt-auto flex flex-col gap-4">
      {messages.length > 0 ? (
        <ol className="mx-auto w-full max-w-2xl space-y-3">
          {messages.map((message) => {
            const text = message.parts
              .filter(isTextUIPart)
              .map((part) => part.text)
              .join("\n");
            const sources = message.parts.filter(
              (part) => part.type === "data-source",
            );
            const outbound = message.role === "user";
            return (
              <li key={message.id} className="space-y-2">
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap",
                    outbound ? "bg-secondary" : "bg-card",
                  )}
                >
                  <p className="mb-1 text-[11px] text-muted-foreground">
                    {outbound ? t("you") : t("assistant")}
                  </p>
                  {text || (busy && !outbound) ? text : null}
                </div>
                {sources.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((part) => (
                      <Badge key={part.data.href} variant="outline" asChild>
                        <Link href={part.data.href}>{part.data.title}</Link>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="sticky bottom-6 flex justify-center">
        <PromptBar
          placeholder={t("prompt_placeholder")}
          suggestions={[suggestion]}
          disabled={busy}
          onSubmit={async (value) => {
            await sendMessage(
              { text: value },
              { body: { threadId: threadIdRef.current } },
            );
          }}
        />
      </div>
    </div>
  );
}
