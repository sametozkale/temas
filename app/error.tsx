"use client";

import { AppError } from "@/components/app-error";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError reset={reset} className="min-h-svh" />;
}
