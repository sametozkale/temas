import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { Tx } from "@/lib/db";
import { conversations, profiles, properties, tasks } from "@/lib/db/schema";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema/tasks";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type TaskListRow = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  source: "manual" | "ai";
  propertyId: string | null;
  propertyTitle: string | null;
  assigneeId: string;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  conversationId: string | null;
  conversationUserId: string | null;
  createdAt: Date;
};

export type TaskGroup = {
  propertyId: string | null;
  propertyTitle: string | null;
  tasks: TaskListRow[];
};

function mapRow(row: {
  task: typeof tasks.$inferSelect;
  propertyTitle: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  conversationUserId: string | null;
}): TaskListRow {
  return {
    id: row.task.id,
    title: row.task.title,
    description: row.task.description,
    priority: row.task.priority,
    status: row.task.status,
    source: row.task.source,
    propertyId: row.task.propertyId,
    propertyTitle: row.propertyTitle,
    assigneeId: row.task.assigneeId,
    assigneeName: row.assigneeName,
    assigneeAvatarUrl: row.assigneeAvatarUrl,
    conversationId: row.task.conversationId,
    conversationUserId: row.conversationUserId,
    createdAt: row.task.createdAt,
  };
}

function sortTasks(rows: TaskListRow[]) {
  return [...rows].sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function listTasksForPage(tx: Tx, workspaceId: string) {
  const statuses: TaskStatus[] = ["suggested", "open", "done"];
  const rows = await tx
    .select({
      task: tasks,
      propertyTitle: properties.title,
      assigneeName: profiles.fullName,
      assigneeAvatarUrl: profiles.avatarUrl,
      conversationUserId: conversations.userId,
    })
    .from(tasks)
    .leftJoin(properties, eq(properties.id, tasks.propertyId))
    .leftJoin(profiles, eq(profiles.id, tasks.assigneeId))
    .leftJoin(conversations, eq(conversations.id, tasks.conversationId))
    .where(
      and(eq(tasks.workspaceId, workspaceId), inArray(tasks.status, statuses)),
    )
    .orderBy(asc(properties.title), desc(tasks.createdAt));

  const mapped = rows.map(mapRow);
  const suggestions = sortTasks(
    mapped.filter((row) => row.status === "suggested"),
  );
  const listed = sortTasks(mapped.filter((row) => row.status === "open"));
  const completed = sortTasks(mapped.filter((row) => row.status === "done"));

  return {
    suggestions,
    groups: groupByProperty(listed),
    completed,
  };
}

function groupByProperty(listed: TaskListRow[]): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const byProperty = new Map<string, TaskGroup>();
  let ungrouped: TaskGroup | null = null;

  for (const row of listed) {
    if (!row.propertyId) {
      if (!ungrouped) {
        ungrouped = { propertyId: null, propertyTitle: null, tasks: [] };
      }
      ungrouped.tasks.push(row);
      continue;
    }
    let group = byProperty.get(row.propertyId);
    if (!group) {
      group = {
        propertyId: row.propertyId,
        propertyTitle: row.propertyTitle,
        tasks: [],
      };
      byProperty.set(row.propertyId, group);
      groups.push(group);
    }
    group.tasks.push(row);
  }
  groups.sort((a, b) =>
    (a.propertyTitle ?? "").localeCompare(b.propertyTitle ?? ""),
  );
  if (ungrouped) groups.push(ungrouped);
  return groups;
}

export async function getTask(tx: Tx, workspaceId: string, id: string) {
  const [row] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}
