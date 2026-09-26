"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Icon, PlusSignIcon } from "@/components/icons";
import { TaskPriorityIcon } from "@/components/tasks/priority-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTask,
  updateTask,
  type TasksState,
} from "@/app/(app)/tasks/actions";
import { TASK_PRIORITIES } from "@/lib/db/schema/tasks";
import { NONE_PROPERTY } from "@/lib/tasks/schema";

export type TaskFormMember = {
  userId: string;
  name: string;
  imageUrl?: string | null;
};
export type TaskFormProperty = { id: string; title: string };

export type TaskFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  propertyId?: string | null;
  priority?: string;
  assigneeId: string;
};

export function TaskDialog({
  members,
  properties,
  currentUserId,
  trigger,
  task,
  defaultPropertyId,
}: {
  members: TaskFormMember[];
  properties: TaskFormProperty[];
  currentUserId: string;
  trigger?: React.ReactNode;
  task?: TaskFormValues;
  /** Prefill property when creating from a group `+`. */
  defaultPropertyId?: string | null;
}) {
  const t = useTranslations("tasks");
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<
    TasksState | undefined,
    FormData
  >(task?.id ? updateTask : createTask, undefined);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const editing = Boolean(task?.id);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(editing ? t("updated") : t("created"));
      setOpen(false);
    } else if (state.error === "forbidden") {
      toast.error(t("errors.forbidden"));
    } else if (state.error !== "invalid") {
      toast.error(t("errors.generic"));
    }
  }, [state, editing, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
            {t("new")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="space-y-6">
          {task?.id ? <input type="hidden" name="id" value={task.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? t("edit_title") : t("new_title")}
            </DialogTitle>
            <DialogDescription>
              {editing ? t("edit_description") : t("new_description")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={fieldErrors?.title ? true : undefined}>
              <FieldLabel htmlFor="task-title">{t("title_label")}</FieldLabel>
              <Input
                id="task-title"
                name="title"
                required
                autoFocus
                defaultValue={task?.title ?? ""}
              />
              {fieldErrors?.title ? (
                <FieldError>{t("errors.title")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="task-description">
                {t("description_label")}
              </FieldLabel>
              <Textarea
                id="task-description"
                name="description"
                defaultValue={task?.description ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-property">{t("property")}</FieldLabel>
              <Select
                name="propertyId"
                defaultValue={
                  task?.propertyId ?? defaultPropertyId ?? NONE_PROPERTY
                }
              >
                <SelectTrigger id="task-property" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PROPERTY}>
                    {t("no_property")}
                  </SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-priority">{t("priority")}</FieldLabel>
              <Select name="priority" defaultValue={task?.priority ?? "medium"}>
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      <span className="flex items-center gap-2">
                        <TaskPriorityIcon
                          priority={priority}
                          label={t(`priority_${priority}`)}
                          decorative
                        />
                        {t(`priority_${priority}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={fieldErrors?.assigneeId ? true : undefined}>
              <FieldLabel htmlFor="task-assignee">{t("assignee")}</FieldLabel>
              <Select
                name="assigneeId"
                defaultValue={task?.assigneeId ?? currentUserId}
              >
                <SelectTrigger id="task-assignee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors?.assigneeId ? (
                <FieldError>{t("errors.assignee")}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {editing ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
