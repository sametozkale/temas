"use client";

import { Collapsible } from "radix-ui";
import { useTranslations } from "next-intl";

import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Icon,
  Loading03Icon,
  Search01Icon,
  type IconSvgElement,
} from "@/components/icons";
import type { ThoughtStep } from "@/lib/ai/tool-dump";
import { cn } from "@/lib/utils";

const LOOKUP = /^(list|get|search|find|read|lookup|preview)/;

function iconFor(tool: string | null): IconSvgElement {
  if (!tool) return CircleIcon;
  return LOOKUP.test(tool) ? Search01Icon : CheckmarkCircle02Icon;
}

/**
 * Reasoning steps on one rail: an icon per step, a hairline joining them.
 * A step with details opens in place; its icon turns into a chevron on hover.
 */
export function ChainOfThought({ steps }: { steps: ThoughtStep[] }) {
  const t = useTranslations("home.ask.thought");
  if (steps.length === 0) return null;

  return (
    <ol aria-label={t("label")} className="w-full min-w-0">
      {steps.map((step, index) => (
        <Step
          key={`${index}-${step.text}`}
          step={step}
          last={index === steps.length - 1}
        />
      ))}
    </ol>
  );
}

/** What the reply is doing right now, shown until its first words stream in. */
export function ThinkingLine({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-start gap-2 text-sm leading-5">
      <Icon
        icon={Loading03Icon}
        size={16}
        className="size-4 shrink-0 text-muted-foreground motion-safe:animate-spin"
      />
      <span className="text-shimmer">{label}</span>
    </div>
  );
}

function Step({ step, last }: { step: ThoughtStep; last: boolean }) {
  const icon = iconFor(step.tool);
  const expandable = step.details.length > 0;

  const glyph = (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <Icon
        icon={icon}
        size={16}
        className={cn(
          "size-4 transition-opacity",
          expandable && "group-hover:opacity-0",
        )}
      />
      {expandable ? (
        <Icon
          icon={ArrowDown01Icon}
          size={16}
          className="absolute size-4 opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-data-[state=open]:rotate-180"
        />
      ) : null}
    </span>
  );

  const label = <span className="min-w-0 wrap-anywhere">{step.text}</span>;
  const rail = (
    <div
      aria-hidden
      className={cn("ml-[7.5px] w-px bg-foreground/15", last ? "h-0" : "h-3")}
    />
  );

  if (!expandable) {
    return (
      <li className="text-sm text-muted-foreground">
        <div className="flex items-start gap-2 leading-5">
          {glyph}
          {label}
        </div>
        {rail}
      </li>
    );
  }

  return (
    <Collapsible.Root asChild>
      <li className="text-sm text-muted-foreground">
        <Collapsible.Trigger className="group flex w-full cursor-pointer items-start gap-2 text-left leading-5 transition-colors hover:text-foreground">
          {glyph}
          {label}
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
            <div
              aria-hidden
              className={cn("ml-[7.5px] w-px", last ? "bg-transparent" : "bg-foreground/15")}
            />
            <ul className="flex flex-col gap-1.5 pt-1.5 pb-0.5">
              {step.details.map((detail, index) => (
                <li key={`${index}-${detail}`} className="wrap-anywhere text-xs leading-5">
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </Collapsible.Content>
        {rail}
      </li>
    </Collapsible.Root>
  );
}
