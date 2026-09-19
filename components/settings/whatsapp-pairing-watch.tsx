"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { isWhatsAppConnected } from "@/app/(app)/settings/integrations/actions";

export function WhatsAppPairingWatch() {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      void isWhatsAppConnected().then((connected) => {
        if (!cancelled && connected) router.refresh();
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}
