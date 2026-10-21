"use client";

import dynamic from "next/dynamic";

/**
 * Sonner and its icons are not needed for first paint. Load them after
 * hydration so they stay off the critical path on slow networks.
 */
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  { ssr: false },
);

export function DeferredToaster() {
  return <Toaster />;
}
