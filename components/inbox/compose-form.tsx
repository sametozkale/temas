"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { sendNewMessage } from "@/app/(app)/inbox/actions";
import { Cancel01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

export type ComposeContact = {
  id: string;
  name: string;
  email: string;
};

function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function ComposeForm({ contacts }: { contacts: ComposeContact[] }) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ conversationId: string }> | undefined,
    FormData
  >(sendNewMessage, undefined);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [recipient, setRecipient] = React.useState<ComposeContact | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok && state.data?.conversationId) {
      toast.success(t("sent"));
      router.push(`/inbox/${state.data.conversationId}`);
      return;
    }
    if (state.ok) return;
    if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error === "no_mailbox") toast.error(t("errors.no_mailbox"));
    else if (state.error === "own_address") toast.error(t("errors.own_address"));
    else if (state.error === "reconnect") toast.error(t("errors.reconnect"));
    else if (state.error !== "invalid") toast.error(t("errors.send_failed"));
  }, [router, state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const needle = fold(query.trim());
  const matches =
    recipient || !needle
      ? []
      : contacts
          .filter(
            (contact) =>
              fold(contact.name).includes(needle) ||
              fold(contact.email).includes(needle),
          )
          .slice(0, 8);

  function choose(contact: ComposeContact) {
    setRecipient(contact);
    setQuery("");
    setOpen(false);
  }

  function clearRecipient() {
    setRecipient(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center gap-2 px-3">
        <Button variant="ghost" size="sm" asChild className="md:hidden">
          <Link href="/inbox">{t("back")}</Link>
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {t("compose_title")}
        </p>
      </div>
      <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <input type="hidden" name="to" value={recipient?.email ?? query} />
        <input type="hidden" name="toName" value={recipient?.name ?? ""} />
        <div className="space-y-3 px-5 pt-2">
          <Field data-invalid={errors?.to ? true : undefined}>
            <FieldLabel htmlFor="compose-to">{t("compose_to")}</FieldLabel>
            {recipient ? (
              <div className="flex h-10 items-center">
                <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm">
                  <span className="truncate">
                    {recipient.name === recipient.email
                      ? recipient.email
                      : recipient.name}
                  </span>
                  <button
                    type="button"
                    aria-label={t("compose_clear")}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={clearRecipient}
                  >
                    <Icon icon={Cancel01Icon} size={16} />
                  </button>
                </span>
              </div>
            ) : (
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="compose-to"
                  value={query}
                  autoComplete="off"
                  placeholder={t("compose_to_placeholder")}
                  aria-autocomplete="list"
                  aria-expanded={open && matches.length > 0}
                  aria-invalid={errors?.to ? true : undefined}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                    setActive(0);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                  onKeyDown={(event) => {
                    if (!open || matches.length === 0) return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActive((index) => (index + 1) % matches.length);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActive(
                        (index) =>
                          (index - 1 + matches.length) % matches.length,
                      );
                    } else if (event.key === "Enter" && matches[active]) {
                      event.preventDefault();
                      choose(matches[active]);
                    } else if (event.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                />
                {open && matches.length > 0 ? (
                  <ul
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-foreground/6 bg-card py-1"
                  >
                    {matches.map((contact, index) => (
                      <li key={contact.id} role="option" aria-selected={index === active}>
                        <button
                          type="button"
                          className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-muted data-[active=true]:bg-muted"
                          data-active={index === active}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(contact)}
                        >
                          <span className="truncate text-sm">
                            {contact.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {contact.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            {errors?.to ? <FieldError>{t("errors.to")}</FieldError> : null}
          </Field>
          <Field data-invalid={errors?.subject ? true : undefined}>
            <FieldLabel htmlFor="compose-subject">
              {t("compose_subject")}
            </FieldLabel>
            <Input
              id="compose-subject"
              name="subject"
              required
              maxLength={200}
              placeholder={t("compose_subject_placeholder")}
              aria-invalid={errors?.subject ? true : undefined}
            />
            {errors?.subject ? (
              <FieldError>{t("errors.subject")}</FieldError>
            ) : null}
          </Field>
        </div>
        <Field
          className="flex min-h-0 flex-1 flex-col px-5 py-3"
          data-invalid={errors?.body ? true : undefined}
        >
          <FieldLabel htmlFor="compose-body" className="sr-only">
            {t("compose_body")}
          </FieldLabel>
          <Textarea
            id="compose-body"
            name="body"
            required
            placeholder={t("compose_body_placeholder")}
            aria-label={t("compose_body")}
            className="h-full min-h-0 flex-1 resize-none field-sizing-fixed"
          />
          {errors?.body ? <FieldError>{t("errors.body")}</FieldError> : null}
        </Field>
        <div className="flex shrink-0 justify-end border-t p-4">
          <Button type="submit" size="sm" disabled={pending}>
            {t("send")}
          </Button>
        </div>
      </form>
    </div>
  );
}
