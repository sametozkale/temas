"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  addStage,
  moveApplication,
  renameStage,
} from "@/app/(app)/properties/[id]/applications/actions";
import { ApplicantSheet } from "@/components/pipeline/applicant-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type KanbanStage = {
  id: string;
  name: string;
  color: string | null;
  isTerminal: boolean;
};

export type KanbanCard = {
  id: string;
  stageId: string | null;
  fullName: string;
  memberLine: string | null;
  email: string | null;
  summary: string | null;
  score: number | null;
};

export function PipelineKanban({
  propertyId,
  stages,
  cards,
  canManage,
}: {
  propertyId: string;
  stages: KanbanStage[];
  cards: KanbanCard[];
  canManage: boolean;
}) {
  const t = useTranslations("pipeline.kanban");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byStage = React.useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const card of cards) {
      const list = card.stageId ? map.get(card.stageId) : undefined;
      if (list) list.push(card);
    }
    return map;
  }, [stages, cards]);

  function onDragEnd(event: DragEndEvent) {
    if (!canManage) return;
    const overId = event.over?.id ? String(event.over.id) : null;
    const appId = String(event.active.id);
    const from = event.active.data.current?.stageId as string | undefined;
    if (!overId) return;
    const overStage = stages.some((s) => s.id === overId)
      ? overId
      : (cards.find((c) => c.id === overId)?.stageId ?? null);
    if (!overStage || overStage === from) return;
    startTransition(async () => {
      const res = await moveApplication(propertyId, appId, overStage);
      if (!res.ok) toast.error(t("errors.generic"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              propertyId={propertyId}
              stage={stage}
              cards={byStage.get(stage.id) ?? []}
              canManage={canManage}
              onOpen={setOpenId}
            />
          ))}
          {canManage ? (
            <form
              className="w-72 shrink-0 space-y-2 rounded-lg border border-dashed p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newName.trim();
                if (!name) return;
                startTransition(async () => {
                  const res = await addStage(propertyId, { name });
                  if (!res.ok) toast.error(t("errors.generic"));
                  else {
                    setNewName("");
                    toast.success(t("stage_added"));
                  }
                  router.refresh();
                });
              }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("add_stage")}
                disabled={pending}
              />
              <Button type="submit" variant="soft" size="xs" disabled={pending}>
                {t("add_stage")}
              </Button>
            </form>
          ) : null}
        </div>
      </DndContext>
      <ApplicantSheet
        propertyId={propertyId}
        applicationId={openId}
        open={Boolean(openId)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </div>
  );
}

function StageColumn({
  propertyId,
  stage,
  cards,
  canManage,
  onOpen,
}: {
  propertyId: string;
  stage: KanbanStage;
  cards: KanbanCard[];
  canManage: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("pipeline.kanban");
  const router = useRouter();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [name, setName] = React.useState(stage.name);

  React.useEffect(() => {
    setName(stage.name);
  }, [stage.name]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-card",
        isOver && "border-brand",
      )}
    >
      <div className={cn("border-t-2 px-3 py-2", toneBorder(stage.color))}>
        {canManage ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== stage.name) {
                void renameStage(propertyId, stage.id, {
                  name: name.trim(),
                }).then((res) => {
                  if (!res.ok) toast.error(t("errors.generic"));
                  router.refresh();
                });
              }
            }}
            className="w-full bg-transparent text-sm font-medium outline-none"
          />
        ) : (
          <p className="text-sm font-medium">{stage.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("count", { count: cards.length })}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {cards.map((card) => (
          <ApplicantCard
            key={card.id}
            card={card}
            canDrag={canManage}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function ApplicantCard({
  card,
  canDrag,
  onOpen,
}: {
  card: KanbanCard;
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { stageId: card.stageId },
      disabled: !canDrag,
    });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(card.id)}
      className={cn(
        "rounded-md border bg-background p-3 text-left transition-colors hover:border-foreground/20",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm font-medium">{card.fullName}</p>
      {card.memberLine ? (
        <p className="truncate text-xs text-muted-foreground">
          {card.memberLine}
        </p>
      ) : card.email ? (
        <p className="truncate text-xs text-muted-foreground">{card.email}</p>
      ) : null}
      {card.summary ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {card.summary}
        </p>
      ) : null}
      {card.score != null ? (
        <Badge variant="info" className="mt-2">
          {card.score}
        </Badge>
      ) : null}
    </button>
  );
}

function toneBorder(color: string | null) {
  switch (color) {
    case "brand":
      return "border-t-brand";
    case "success":
      return "border-t-success";
    case "warning":
      return "border-t-warning";
    case "info":
      return "border-t-info";
    case "destructive":
      return "border-t-destructive";
    default:
      return "border-t-border";
  }
}
