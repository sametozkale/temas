"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  fillInboxThread,
  refreshInboxFromGmail,
} from "@/app/(app)/inbox/actions";

/** Pull Gmail after the stored inbox is already on screen. */
export function InboxLiveSync({
  conversationId,
}: {
  conversationId?: string;
}) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    const pull = conversationId
      ? fillInboxThread(conversationId)
      : refreshInboxFromGmail();
    void pull.then((changed) => {
      if (!cancelled && changed) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, router]);

  return null;
}
