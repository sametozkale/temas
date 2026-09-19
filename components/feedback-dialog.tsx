"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { sendFeedback, type FeedbackState } from "@/app/(app)/feedback/actions";
import { ChatFeedbackIcon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeedbackDialog({ collapsed }: { collapsed?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<
    FeedbackState | undefined,
    FormData
  >(sendFeedback, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("feedback_sent"));
      setOpen(false);
    } else if (state.error !== "invalid") {
      toast.error(t(`feedback_errors.${state.error}`));
    }
  }, [state, t]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("feedback")}
            onClick={() => setOpen(true)}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <Icon icon={ChatFeedbackIcon} size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={collapsed ? "right" : "top"}>
          {t("feedback")}
        </TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            action={action}
            className="space-y-6"
            key={open ? "open" : "closed"}
          >
            <DialogHeader>
              <DialogTitle>{t("feedback")}</DialogTitle>
              <DialogDescription>{t("feedback_description")}</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="path" value={pathname} />
            <FieldGroup>
              <Field data-invalid={fieldErrors?.body ? true : undefined}>
                <FieldLabel htmlFor="feedback-body">
                  {t("feedback_body")}
                </FieldLabel>
                <Textarea
                  id="feedback-body"
                  name="body"
                  required
                  minLength={8}
                  maxLength={4000}
                  autoFocus
                  rows={5}
                  placeholder={t("feedback_placeholder")}
                  aria-invalid={fieldErrors?.body ? true : undefined}
                  className="min-h-32 resize-y"
                />
                {fieldErrors?.body ? (
                  <FieldError>{t("feedback_errors.invalid")}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {t("feedback_send")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
