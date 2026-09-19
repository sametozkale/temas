"use client";

import { AppError } from "@/components/app-error";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError reset={reset} className="min-h-[calc(100svh-3.5rem)]" />;
}
