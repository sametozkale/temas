"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WalkthroughStep = {
  label: string;
  title: string;
  body: string;
  screen: ReactNode;
};

function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-2xl bg-secondary p-4 sm:p-8",
        className,
      )}
    >
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}

/** Steps scroll on the left while the matching screen stays pinned on the right. */
export function FeatureWalkthrough({ steps }: { steps: WalkthroughStep[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const node of stepRefs.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [steps.length]);

  return (
    <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.label}
            ref={(node) => {
              stepRefs.current[index] = node;
            }}
            data-step={index}
            className="py-10 first:pt-0 lg:flex lg:min-h-[72vh] lg:items-center lg:py-0"
          >
            <div
              className={cn(
                "transition-opacity duration-300 motion-reduce:transition-none",
                index === active ? "lg:opacity-100" : "lg:opacity-30",
              )}
            >
              <p className="text-sm text-muted-foreground tabular-nums">{step.label}</p>
              <h3 className="mt-3 font-serif text-2xl leading-tight font-normal tracking-tight text-balance sm:text-3xl">
                {step.title}
              </h3>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <Stage className="mt-8 lg:hidden">{step.screen}</Stage>
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-17.5rem)]">
          <Stage className="h-[35rem]">
            <div className="grid">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className={cn(
                    "col-start-1 row-start-1 self-center transition duration-500 ease-out motion-reduce:transition-none",
                    index === active
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-2 opacity-0",
                  )}
                >
                  {step.screen}
                </div>
              ))}
            </div>
          </Stage>
          <div className="mt-4 flex justify-center gap-1.5">
            {steps.map((step, index) => (
              <span
                key={step.label}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
                  index === active ? "w-6 bg-foreground" : "w-1.5 bg-foreground/15",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
