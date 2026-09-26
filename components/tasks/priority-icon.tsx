import type { TaskPriority } from "@/lib/db/schema/tasks";
import { cn } from "@/lib/utils";

const BARS = [
  { x: 1.5, y: 9.25, height: 5 },
  { x: 6.75, y: 6, height: 8.25 },
  { x: 12, y: 2.75, height: 11.5 },
] as const;

/** Linear priority marks: one, two, or three filled bars. */
function PriorityBars({ filled }: { filled: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      {BARS.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={bar.y}
          width="2.5"
          height={bar.height}
          rx="0.75"
          opacity={index < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

/** Filled rounded square with the exclamation cut out. */
function UrgentMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.1 1.85h7.8a2.25 2.25 0 0 1 2.25 2.25v7.8a2.25 2.25 0 0 1-2.25 2.25h-7.8a2.25 2.25 0 0 1-2.25-2.25v-7.8a2.25 2.25 0 0 1 2.25-2.25zM7.2 4.7a.8.8 0 0 1 1.6 0v3.85a.8.8 0 0 1-1.6 0V4.7zM8 12.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z"
      />
    </svg>
  );
}

/** Linear priority marks: bar levels for low / medium / high, badge for urgent. */
export function TaskPriorityIcon({
  priority,
  label,
  decorative = false,
}: {
  priority: TaskPriority;
  label: string;
  decorative?: boolean;
}) {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center text-foreground",
      )}
    >
      {priority === "urgent" ? (
        <UrgentMark />
      ) : (
        <PriorityBars
          filled={priority === "high" ? 3 : priority === "medium" ? 2 : 1}
        />
      )}
    </span>
  );
}
