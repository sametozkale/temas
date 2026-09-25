"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { loadOlderMail } from "@/app/(app)/inbox/actions";

export function InboxOlderMail({ hasMore }: { hasMore: boolean }) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const sentinel = React.useRef<HTMLDivElement>(null);
  const armed = React.useRef(true);
  const loading = React.useRef(false);
  const [more, setMore] = React.useState(hasMore);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setMore(hasMore);
  }, [hasMore]);

  React.useEffect(() => {
    const node = sentinel.current;
    if (!node || !more) return;
    const root = node.closest("[data-inbox-list]");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          armed.current = true;
          return;
        }
        if (!armed.current || loading.current) return;
        armed.current = false;
        loading.current = true;
        startTransition(async () => {
          const res = await loadOlderMail();
          loading.current = false;
          if (!res.ok) {
            armed.current = true;
            toast.error(t(`errors.${res.error}`));
            return;
          }
          setMore(res.data?.more ?? false);
          router.refresh();
        });
      },
      { root: root instanceof HTMLElement ? root : null, rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, router, t]);

  if (!more && !pending) return null;

  return (
    <div
      ref={sentinel}
      className="px-3 py-3 text-center text-xs text-muted-foreground"
    >
      {pending ? t("loading_older") : null}
    </div>
  );
}
