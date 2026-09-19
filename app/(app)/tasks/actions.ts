"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { properties, tasks, workspaceMembers } from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { uuidSchema } from "@/lib/properties/schema";
import {
  optionalPropertyId,
  taskPatchSchema,
  taskWriteSchema,
} from "@/lib/tasks/schema";
import { getTask } from "@/lib/tasks/queries";

export type TasksState = ActionResult;

async function assertMember(
  tx: Parameters<Parameters<typeof withUserContext>[1]>[0],
  workspaceId: string,
  userId: string,
) {
  const [row] = await tx
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function assertProperty(
  tx: Parameters<Parameters<typeof withUserContext>[1]>[0],
  workspaceId: string,
  propertyId: string | null,
) {
  if (!propertyId) return true;
  const [row] = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function gate(ctx: Awaited<ReturnType<typeof getAppContext>>) {
  try {
    requireAbility(ctx.membership, "tasks.write");
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
}

export async function createTask(
  _prev: TasksState | undefined,
  formData: FormData,
): Promise<TasksState> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;

  const parsed = taskWriteSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    propertyId: formData.get("propertyId") || "none",
    priority: formData.get("priority") || "medium",
    assigneeId: formData.get("assigneeId") || ctx.user.id,
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const propertyId = optionalPropertyId(parsed.data.propertyId);

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      if (!(await assertMember(tx, ctx.workspace.id, parsed.data.assigneeId))) {
        return actionError("invalid", { assigneeId: ["member"] });
      }
      if (!(await assertProperty(tx, ctx.workspace.id, propertyId))) {
        return actionError("invalid", { propertyId: ["property"] });
      }
      const [row] = await tx
        .insert(tasks)
        .values({
          workspaceId: ctx.workspace.id,
          propertyId,
          title: parsed.data.title,
          description: parsed.data.description || null,
          priority: parsed.data.priority,
          status: "open",
          source: "manual",
          assigneeId: parsed.data.assigneeId,
          createdBy: ctx.user.id,
        })
        .returning({ id: tasks.id });
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId,
          action: "task.created",
          entity: "task",
          entityId: row!.id,
          data: { title: parsed.data.title },
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}

export async function updateTask(
  _prev: TasksState | undefined,
  formData: FormData,
): Promise<TasksState> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;

  const idParsed = uuidSchema.safeParse(formData.get("id"));
  if (!idParsed.success) return actionError("not_found");

  const parsed = taskWriteSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    propertyId: formData.get("propertyId") || "none",
    priority: formData.get("priority") || "medium",
    assigneeId: formData.get("assigneeId"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const propertyId = optionalPropertyId(parsed.data.propertyId);

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      const existing = await getTask(tx, ctx.workspace.id, idParsed.data);
      if (!existing || existing.status === "suggested") {
        return actionError("not_found");
      }
      if (!(await assertMember(tx, ctx.workspace.id, parsed.data.assigneeId))) {
        return actionError("invalid", { assigneeId: ["member"] });
      }
      if (!(await assertProperty(tx, ctx.workspace.id, propertyId))) {
        return actionError("invalid", { propertyId: ["property"] });
      }
      await tx
        .update(tasks)
        .set({
          title: parsed.data.title,
          description: parsed.data.description || null,
          priority: parsed.data.priority,
          propertyId,
          assigneeId: parsed.data.assigneeId,
        })
        .where(
          and(
            eq(tasks.id, existing.id),
            eq(tasks.workspaceId, ctx.workspace.id),
          ),
        );
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId,
          action: "task.updated",
          entity: "task",
          entityId: existing.id,
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}

export async function patchTask(input: unknown): Promise<ActionResult> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;

  const parsed = taskPatchSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      const existing = await getTask(tx, ctx.workspace.id, parsed.data.id);
      if (!existing || existing.status === "suggested") {
        return actionError("not_found");
      }
      if (
        parsed.data.assigneeId &&
        !(await assertMember(tx, ctx.workspace.id, parsed.data.assigneeId))
      ) {
        return actionError("invalid", { assigneeId: ["member"] });
      }
      await tx
        .update(tasks)
        .set({
          ...(parsed.data.title !== undefined
            ? { title: parsed.data.title }
            : {}),
          ...(parsed.data.priority !== undefined
            ? { priority: parsed.data.priority }
            : {}),
          ...(parsed.data.assigneeId !== undefined
            ? { assigneeId: parsed.data.assigneeId }
            : {}),
        })
        .where(
          and(
            eq(tasks.id, existing.id),
            eq(tasks.workspaceId, ctx.workspace.id),
          ),
        );
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: existing.propertyId,
          action: "task.updated",
          entity: "task",
          entityId: existing.id,
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}

export async function acceptTask(id: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return actionError("not_found");

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      const existing = await getTask(tx, ctx.workspace.id, parsed.data);
      if (!existing || existing.status !== "suggested") {
        return actionError("not_found");
      }
      await tx
        .update(tasks)
        .set({
          status: "open",
          userId: null,
          assigneeId: ctx.user.id,
        })
        .where(
          and(
            eq(tasks.id, existing.id),
            eq(tasks.workspaceId, ctx.workspace.id),
          ),
        );
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: existing.propertyId,
          action: "task.accepted",
          entity: "task",
          entityId: existing.id,
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}

export async function dismissTask(id: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return actionError("not_found");

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      const existing = await getTask(tx, ctx.workspace.id, parsed.data);
      if (!existing || existing.status !== "suggested") {
        return actionError("not_found");
      }
      await tx
        .update(tasks)
        .set({ status: "dismissed" })
        .where(
          and(
            eq(tasks.id, existing.id),
            eq(tasks.workspaceId, ctx.workspace.id),
          ),
        );
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: existing.propertyId,
          action: "task.dismissed",
          entity: "task",
          entityId: existing.id,
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}

export async function toggleTaskDone(id: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return actionError("not_found");

  const result = await withUserContext(
    ctx.user.id,
    async (tx): Promise<TasksState> => {
      const existing = await getTask(tx, ctx.workspace.id, parsed.data);
      if (!existing || existing.status === "suggested") {
        return actionError("not_found");
      }
      const next = existing.status === "done" ? "open" : "done";
      await tx
        .update(tasks)
        .set({ status: next })
        .where(
          and(
            eq(tasks.id, existing.id),
            eq(tasks.workspaceId, ctx.workspace.id),
          ),
        );
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: existing.propertyId,
          action: next === "done" ? "task.completed" : "task.reopened",
          entity: "task",
          entityId: existing.id,
        },
        tx,
      );
      return actionOk();
    },
  );

  revalidatePath("/tasks");
  return result;
}
