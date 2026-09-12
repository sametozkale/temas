"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  draftReply,
  sendReply,
  type InboxState,
} from "@/app/(app)/inbox/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TONES, type DraftTone } from "@/lib/ai/types";

export function ReplyComposer({
  conversationId,
  defaultTone,
  canDraft,
}: {
  conversationId: string;
  defaultTone: DraftTone;
  canDraft: boolean;
}) {
  const t = useTranslations("inbox");
  const action = sendReply.bind(null, conversationId);
  const [state, formAction, pending] = useActionState<
    InboxState | undefined,
    FormData
  >(action, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [body, setBody] = React.useState("");
  const [draftId, setDraftId] = React.useState("");
  const [tone, setTone] = React.useState<DraftTone>(defaultTone);
  const [drafting, setDrafting] = React.useState(false);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("reply_sent"));
      formRef.current?.reset();
      setBody("");
      setDraftId("");
    } else if (state.error === "no_recipient") {
      toast.error(t("errors.no_recipient"));
    } else if (state.error === "forbidden") {
      toast.error(t("errors.forbidden"));
    } else if (state.error !== "invalid") {
      toast.error(t("errors.send_failed"));
    }
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  async function handleDraft() {
    setDrafting(true);
    const result = await draftReply(conversationId, tone);
    setDrafting(false);
    if (!result.ok || !result.data) {
      toast.error(t("draft_failed"));
      return;
    }
    setDraftId(result.data.id);
    setBody(result.data.body);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2 border-t p-4">
      <input type="hidden" name="draftId" value={draftId} />
      <Field data-invalid={errors?.body ? true : undefined}>
        <Textarea
          name="body"
          rows={4}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("reply_placeholder")}
          aria-label={t("reply_placeholder")}
        />
        {errors?.body ? <FieldError>{t("errors.body")}</FieldError> : null}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canDraft ? (
          <div className="flex items-center gap-2">
            <Select
              value={tone}
              onValueChange={(value) => setTone(value as DraftTone)}
            >
              <SelectTrigger size="sm" aria-label={t("tone")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`tone_${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={drafting || pending}
              onClick={() => void handleDraft()}
            >
              {drafting ? t("draft_pending") : t("draft_ai")}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
