import type { ReactNode } from "react";

export function IntegrationSetup({
  steps,
  qr,
  qrLabel,
  hint,
  children,
}: {
  steps: string[];
  qr?: string;
  qrLabel?: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <p className="min-w-0 text-sm leading-6">{step}</p>
          </li>
        ))}
      </ol>
      {qr ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-2xl border bg-card p-4 text-foreground [&_svg]:size-44"
            role="img"
            aria-label={qrLabel}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          {hint ? (
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
