import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { CheckmarkSquare02Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  TaskBoard,
  type TaskBoardGroup,
  type TaskBoardItem,
} from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/lib/auth-utils";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { can, requireAbility } from "@/lib/permissions";
import { listWorkspaceMembers } from "@/lib/properties/assignment";
import { listProperties } from "@/lib/properties/queries";
import { avatarPublicUrl } from "@/lib/storage-constants";
import {
  listTasksForPage,
  type TaskGroup,
  type TaskListRow,
} from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const VIEWS = ["all", "assigned", "suggested"] as const;
type TasksView = (typeof VIEWS)[number];

function parseView(value: string | undefined): TasksView {
  return VIEWS.includes(value as TasksView) ? (value as TasksView) : "all";
}

function toBoardItem(task: TaskListRow, timeZone: string): TaskBoardItem {
  const { createdAt, assigneeAvatarUrl, ...rest } = task;
  return {
    ...rest,
    createdLabel: formatDate(
      createdAt,
      { month: "short", day: "numeric" },
      timeZone,
    ),
    assigneeInitials: initialsOf(task.assigneeName),
    assigneeImageUrl: avatarPublicUrl(assigneeAvatarUrl),
  };
}

function toBoardGroup(group: TaskGroup, timeZone: string): TaskBoardGroup {
  return {
    ...group,
    tasks: group.tasks.map((task) => toBoardItem(task, timeZone)),
  };
}

function filterAssigned(groups: TaskGroup[], userId: string): TaskGroup[] {
  return groups
    .map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => task.assigneeId === userId),
    }))
    .filter((group) => group.tasks.length > 0);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [t, ctx, params] = await Promise.all([
    getTranslations("tasks"),
    getAppContext(),
    searchParams,
  ]);
  requireAbility(ctx.membership, "tasks.read");
  const view = parseView(params.view);
  const canWrite = can(ctx.membership.role, "tasks.write");

  const { suggestions, groups, completed, members, properties } =
    await withUserContext(ctx.user.id, async (tx) => {
      const [listed, members, properties] = await Promise.all([
        listTasksForPage(tx, ctx.workspace.id),
        listWorkspaceMembers(tx, ctx.workspace.id),
        listProperties(tx, ctx.workspace.id),
      ]);
      return { ...listed, members, properties };
    });

  const memberOptions = members.map((member) => ({
    userId: member.userId,
    name: member.fullName ?? member.userId,
    imageUrl: avatarPublicUrl(member.avatarUrl),
  }));
  const propertyOptions = properties.map((property) => ({
    id: property.id,
    title: property.title,
  }));

  const assignedGroups =
    view === "assigned" ? filterAssigned(groups, ctx.user.id) : groups;
  const assignedCompleted =
    view === "assigned"
      ? completed.filter((task) => task.assigneeId === ctx.user.id)
      : completed;

  const timeZone = ctx.workspace.timezone;
  const boardSuggestions = (view === "assigned" ? [] : suggestions).map(
    (task) => toBoardItem(task, timeZone),
  );
  const boardGroups = (view === "suggested" ? [] : assignedGroups).map(
    (group) => toBoardGroup(group, timeZone),
  );
  const boardCompleted = (view === "suggested" ? [] : assignedCompleted).map(
    (task) => toBoardItem(task, timeZone),
  );

  const empty =
    boardSuggestions.length === 0 &&
    boardGroups.length === 0 &&
    boardCompleted.length === 0;

  const tabs: { id: TasksView; href: string; label: string }[] = [
    { id: "all", href: "/tasks", label: t("view_all") },
    {
      id: "assigned",
      href: "/tasks?view=assigned",
      label: t("view_assigned"),
    },
    {
      id: "suggested",
      href: "/tasks?view=suggested",
      label:
        suggestions.length > 0
          ? t("view_suggested_count", { count: suggestions.length })
          : t("view_suggested"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        actions={
          canWrite ? (
            <TaskDialog
              members={memberOptions}
              properties={propertyOptions}
              currentUserId={ctx.user.id}
            />
          ) : null
        }
      />

      <nav aria-label={t("views")} className="flex items-center gap-1 border-b">
        {tabs.map((tab) => {
          const active = view === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-[1.5px] after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {empty ? (
        <EmptyState
          icon={CheckmarkSquare02Icon}
          title={
            view === "suggested"
              ? t("empty_suggestions_title")
              : t("empty_title")
          }
          description={
            view === "suggested"
              ? t("empty_suggestions_description")
              : t("empty_description")
          }
          action={
            canWrite && view !== "suggested" ? (
              <TaskDialog
                members={memberOptions}
                properties={propertyOptions}
                currentUserId={ctx.user.id}
                trigger={
                  <Button variant="ghost" size="sm">
                    {t("new")}
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <TaskBoard
          suggestions={boardSuggestions}
          groups={boardGroups}
          completed={boardCompleted}
          members={memberOptions}
          properties={propertyOptions}
          currentUserId={ctx.user.id}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
