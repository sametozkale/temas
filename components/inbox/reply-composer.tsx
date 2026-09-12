"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { sendReply, type InboxState } from "@/app/(app)/inbox/actions";

export function ReplyComposer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("inbox");
  const action = sendReply.bind(null, conversationId);
  const [state, formAction, pending] = useActionState<
    InboxState | undefined,
    FormData
  >(action, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("reply_sent"));
      formRef.current?.reset();
    } else if (state.error === "no_recipient") {
      toast.error(t("errors.no_recipient"));
    } else if (state.error === "forbidden") {
      toast.error(t("errors.forbidden"));
    } else if (state.error !== "invalid") {
      toast.error(t("errors.send_failed"));
    }
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-2 border-t p-4">
      <Field data-invalid={errors?.body ? true : undefined}>
        <Textarea
          name="body"
          rows={4}
          required
          placeholder={t("reply_placeholder")}
          aria-label={t("reply_placeholder")}
        />
        {errors?.body ? <FieldError>{t("errors.body")}</FieldError> : null}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
