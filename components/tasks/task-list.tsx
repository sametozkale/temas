"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  acceptTask,
  dismissTask,
  patchTask,
  toggleTaskDone,
} from "@/app/(app)/tasks/actions";
import {
  ArrowDown01Icon,
  Icon,
  PlusSignIcon,
  SignalHighIcon,
  SignalLow01Icon,
  SignalMedium01Icon,
} from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/lib/auth-utils";
import type { TaskPriority } from "@/lib/db/schema/tasks";
import { TASK_PRIORITIES } from "@/lib/db/schema/tasks";
import type { TaskListRow } from "@/lib/tasks/queries";
import { readLocalPreference, writeLocalPreference } from "@/lib/ui-preference";
import { cn } from "@/lib/utils";

import {
  TaskDialog,
  type TaskFormMember,
  type TaskFormProperty,
} from "./task-dialog";

const ROW_CLASS =
  "flex h-10 items-center gap-2 rounded-md px-3 hover:bg-muted/40";

export type TaskBoardItem = Omit<
  TaskListRow,
  "createdAt" | "assigneeAvatarUrl"
> & {
  createdLabel: string;
  assigneeInitials: string;
  assigneeImageUrl: string | null;
};

export type TaskBoardGroup = {
  propertyId: string | null;
  propertyTitle: string | null;
  tasks: TaskBoardItem[];
};

type BoardProps = {
  suggestions: TaskBoardItem[];
  groups: TaskBoardGroup[];
  completed: TaskBoardItem[];
  members: TaskFormMember[];
  properties: TaskFormProperty[];
  currentUserId: string;
  canWrite: boolean;
};

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = readLocalPreference("tasks-collapsed");
    if (!raw) return { completed: true };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { completed: true };
    return { completed: true, ...(parsed as Record<string, boolean>) };
  } catch {
    return { completed: true };
  }
}

function isPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function TaskBoard({
  suggestions,
  groups,
  completed,
  members,
  properties,
  currentUserId,
  canWrite,
}: BoardProps) {
  const t = useTranslations("tasks");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
    completed: true,
  });

  React.useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        writeLocalPreference("tasks-collapsed", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {suggestions.length > 0 ? (
        <TaskGroupBlock
          id="suggestions"
          title={t("suggestions")}
          count={suggestions.length}
          collapsed={Boolean(collapsed.suggestions)}
          onToggle={() => toggle("suggestions")}
        >
          {suggestions.map((task) => (
            <SuggestionRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
            />
          ))}
        </TaskGroupBlock>
      ) : null}

      {groups.map((group) => {
        const id = group.propertyId ?? "none";
        return (
          <TaskGroupBlock
            key={id}
            id={id}
            title={group.propertyTitle ?? t("no_property")}
            count={group.tasks.length}
            collapsed={Boolean(collapsed[id])}
            onToggle={() => toggle(id)}
            addAction={
              canWrite ? (
                <TaskDialog
                  members={members}
                  properties={properties}
                  currentUserId={currentUserId}
                  defaultPropertyId={group.propertyId}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("new")}
                      className="text-muted-foreground"
                    >
                      <Icon icon={PlusSignIcon} size={16} />
                    </Button>
                  }
                />
              ) : null
            }
          >
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                canWrite={canWrite}
              />
            ))}
          </TaskGroupBlock>
        );
      })}

      {completed.length > 0 ? (
        <TaskGroupBlock
          id="completed"
          title={t("completed")}
          count={completed.length}
          collapsed={collapsed.completed !== false}
          onToggle={() => toggle("completed")}
        >
          {completed.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              canWrite={canWrite}
              showProperty
            />
          ))}
        </TaskGroupBlock>
      ) : null}
    </div>
  );
}

function TaskGroupBlock({
  id,
  title,
  count,
  collapsed,
  onToggle,
  addAction,
  children,
}: {
  id: string;
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  addAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("tasks");

  return (
    <section>
      <div className="flex h-9 items-center gap-0.5 rounded-lg bg-muted/70 px-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={`task-group-${id}`}
          title={collapsed ? t("expand_group") : t("collapse_group")}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-left text-[13px] font-medium transition-colors hover:text-foreground"
        >
          <span
            className={cn(
              "inline-flex shrink-0 text-muted-foreground transition-transform duration-150",
              collapsed && "-rotate-90",
            )}
          >
            <Icon icon={ArrowDown01Icon} size={16} />
          </span>
          <span className="truncate">{title}</span>
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {count}
          </span>
        </button>
        {addAction}
      </div>
      {!collapsed ? (
        <div id={`task-group-${id}`} className="flex flex-col gap-0.5 pt-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function PriorityIcon({
  priority,
  label,
  decorative = false,
}: {
  priority: TaskListRow["priority"];
  label: string;
  decorative?: boolean;
}) {
  const icon =
    priority === "high"
      ? SignalHighIcon
      : priority === "medium"
        ? SignalMedium01Icon
        : SignalLow01Icon;
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center",
        priority === "high" ? "text-warning" : "text-muted-foreground",
      )}
    >
      <Icon icon={icon} size={16} />
    </span>
  );
}

function StatusToggle({
  done,
  label,
  onToggle,
}: {
  done: boolean;
  label: string;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <Checkbox
      checked={done}
      aria-label={label}
      onCheckedChange={() => void onToggle()}
      className="size-4"
    />
  );
}

function PriorityPicker({
  priority,
  canWrite,
  onChange,
}: {
  priority: TaskPriority;
  canWrite: boolean;
  onChange: (next: TaskPriority) => void;
}) {
  const t = useTranslations("tasks");
  const icon = (
    <PriorityIcon
      priority={priority}
      label={t(`priority_${priority}`)}
      decorative={canWrite}
    />
  );
  if (!canWrite) return icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("change_priority")}: ${t(`priority_${priority}`)}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-50 w-40">
        <DropdownMenuRadioGroup
          value={priority}
          onValueChange={(value) => {
            if (isPriority(value) && value !== priority) onChange(value);
          }}
        >
          {TASK_PRIORITIES.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              aria-label={t(`priority_${value}`)}
            >
              <PriorityIcon
                priority={value}
                label={t(`priority_${value}`)}
                decorative
              />
              {t(`priority_${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssigneePicker({
  assigneeId,
  initials,
  imageUrl,
  members,
  canWrite,
  onChange,
}: {
  assigneeId: string;
  initials: string;
  imageUrl: string | null;
  members: TaskFormMember[];
  canWrite: boolean;
  onChange: (next: string) => void;
}) {
  const t = useTranslations("tasks");
  const avatar = (
    <PersonAvatar
      src={imageUrl}
      initials={initials}
      className="size-[18px]"
      fallbackClassName="text-[9px]"
    />
  );
  if (!canWrite) {
    return <span className="hidden sm:flex">{avatar}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("change_assignee")}
        className="hidden size-6 shrink-0 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring sm:inline-flex"
      >
        {avatar}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {members.map((member) => (
          <DropdownMenuItem
            key={member.userId}
            onSelect={() => {
              if (member.userId !== assigneeId) onChange(member.userId);
            }}
          >
            <PersonAvatar
              src={member.imageUrl}
              initials={initialsOf(member.name)}
              className="size-[18px]"
              fallbackClassName="text-[9px]"
            />
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineTitle({
  title,
  done,
  canWrite,
  onSave,
}: {
  title: string;
  done: boolean;
  canWrite: boolean;
  onSave: (next: string) => Promise<boolean>;
}) {
  const t = useTranslations("tasks");
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(title);
  const committing = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  React.useEffect(() => {
    if (!editing) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [editing]);

  async function commit() {
    if (committing.current) return;
    committing.current = true;
    const next = value.trim();
    setEditing(false);
    if (!next || next === title) {
      setValue(title);
      committing.current = false;
      return;
    }
    const ok = await onSave(next);
    if (!ok) setValue(title);
    committing.current = false;
  }

  if (!canWrite) {
    return (
      <p
        className={cn(
          "truncate text-[13px] font-medium",
          done && "text-muted-foreground line-through",
        )}
      >
        {title}
      </p>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={t("title_label")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            committing.current = true;
            setValue(title);
            setEditing(false);
            committing.current = false;
          }
        }}
        className="h-7 w-full min-w-0 bg-transparent text-[13px] font-medium outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full truncate rounded-sm text-left text-[13px] font-medium hover:text-foreground",
        done && "text-muted-foreground line-through",
      )}
    >
      {title}
    </button>
  );
}

export function SuggestionRow({
  task,
  currentUserId,
}: {
  task: TaskBoardItem;
  currentUserId: string;
}) {
  const t = useTranslations("tasks");
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const canOpenThread =
    task.conversationId && task.conversationUserId === currentUserId;

  async function run(
    fn: (id: string) => Promise<{ ok: boolean; error?: string }>,
  ) {
    setPending(true);
    const result = await fn(task.id);
    setPending(false);
    if (!result.ok) {
      toast.error(
        result.error === "forbidden"
          ? t("errors.forbidden")
          : t("errors.generic"),
      );
    } else {
      router.refresh();
    }
  }

  return (
    <div className={ROW_CLASS}>
      <PriorityIcon
        priority={task.priority}
        label={t(`priority_${task.priority}`)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{task.title}</p>
      </div>
      {task.propertyTitle ? (
        <span className="hidden max-w-[10rem] truncate rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground sm:inline">
          {task.propertyTitle}
        </span>
      ) : null}
      {canOpenThread ? (
        <Button type="button" size="xs" variant="ghost" asChild>
          <Link href={`/inbox/${task.conversationId}`}>{t("open_thread")}</Link>
        </Button>
      ) : null}
      <Button
        type="button"
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => void run(dismissTask)}
      >
        {t("dismiss")}
      </Button>
      <Button
        type="button"
        size="xs"
        disabled={pending}
        onClick={() => void run(acceptTask)}
      >
        {t("accept")}
      </Button>
    </div>
  );
}

export function TaskRow({
  task,
  members,
  canWrite,
  showProperty = false,
}: {
  task: TaskBoardItem;
  members: TaskFormMember[];
  canWrite: boolean;
  showProperty?: boolean;
}) {
  const t = useTranslations("tasks");
  const router = useRouter();
  const done = task.status === "done";
  const [title, setTitle] = React.useState(task.title);
  const [priority, setPriority] = React.useState(task.priority);
  const [assigneeId, setAssigneeId] = React.useState(task.assigneeId);
  const [assigneeInitials, setAssigneeInitials] = React.useState(
    task.assigneeInitials,
  );
  const [assigneeImageUrl, setAssigneeImageUrl] = React.useState(
    task.assigneeImageUrl,
  );

  React.useEffect(() => {
    setTitle(task.title);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);
    setAssigneeInitials(task.assigneeInitials);
    setAssigneeImageUrl(task.assigneeImageUrl);
  }, [
    task.title,
    task.priority,
    task.assigneeId,
    task.assigneeInitials,
    task.assigneeImageUrl,
  ]);

  function fail(error?: string) {
    toast.error(
      error === "forbidden" ? t("errors.forbidden") : t("errors.generic"),
    );
  }

  async function patch(fields: {
    title?: string;
    priority?: TaskPriority;
    assigneeId?: string;
  }) {
    const result = await patchTask({ id: task.id, ...fields });
    if (!result.ok) {
      fail(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className={ROW_CLASS}>
      <PriorityPicker
        priority={priority}
        canWrite={canWrite}
        onChange={(next) => {
          const prev = priority;
          setPriority(next);
          void patch({ priority: next }).then((ok) => {
            if (!ok) setPriority(prev);
          });
        }}
      />
      <StatusToggle
        done={done}
        label={done ? t("reopen") : t("complete")}
        onToggle={async () => {
          const result = await toggleTaskDone(task.id);
          if (!result.ok) {
            fail(result.error);
            return;
          }
          router.refresh();
        }}
      />
      <div className="min-w-0 flex-1">
        <InlineTitle
          title={title}
          done={done}
          canWrite={canWrite}
          onSave={async (next) => {
            setTitle(next);
            const ok = await patch({ title: next });
            if (!ok) setTitle(title);
            return ok;
          }}
        />
      </div>
      {showProperty && task.propertyTitle ? (
        <span className="hidden max-w-[10rem] truncate rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground sm:inline">
          {task.propertyTitle}
        </span>
      ) : null}
      <AssigneePicker
        assigneeId={assigneeId}
        initials={assigneeInitials}
        imageUrl={assigneeImageUrl}
        members={members}
        canWrite={canWrite}
        onChange={(next) => {
          const prevId = assigneeId;
          const prevInitials = assigneeInitials;
          const prevImage = assigneeImageUrl;
          const member = members.find((row) => row.userId === next);
          setAssigneeId(next);
          setAssigneeInitials(initialsOf(member?.name));
          setAssigneeImageUrl(member?.imageUrl ?? null);
          void patch({ assigneeId: next }).then((ok) => {
            if (!ok) {
              setAssigneeId(prevId);
              setAssigneeInitials(prevInitials);
              setAssigneeImageUrl(prevImage);
            }
          });
        }}
      />
      <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:inline">
        {task.createdLabel}
      </span>
    </div>
  );
}
