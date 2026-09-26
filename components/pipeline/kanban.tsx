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
import { PersonAvatar } from "@/components/identity-marks";
import { Add01Icon, Icon } from "@/components/icons";
import { ApplicantSheet } from "@/components/pipeline/applicant-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialsOf } from "@/lib/auth-utils";
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
  const [adding, setAdding] = React.useState(false);
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
    <div className="space-y-3">
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start gap-2 overflow-x-auto pb-1">
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
            adding ? (
              <form
                className="w-52 shrink-0 space-y-2 rounded-lg border border-dashed p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newName.trim();
                  if (!name) return;
                  startTransition(async () => {
                    const res = await addStage(propertyId, { name });
                    if (!res.ok) toast.error(t("errors.generic"));
                    else {
                      setNewName("");
                      setAdding(false);
                      toast.success(t("stage_added"));
                    }
                    router.refresh();
                  });
                }}
              >
                <Input
                  size="sm"
                  value={newName}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setNewName("");
                      setAdding(false);
                    }
                  }}
                  placeholder={t("add_stage")}
                  disabled={pending}
                />
                <div className="flex gap-1">
                  <Button
                    type="submit"
                    variant="soft"
                    size="xs"
                    disabled={pending || !newName.trim()}
                  >
                    {t("add_stage")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setNewName("");
                      setAdding(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                onClick={() => setAdding(true)}
              >
                <Icon icon={Add01Icon} size={16} data-icon="inline-start" />
                {t("add_stage")}
              </Button>
            )
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
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    setName(stage.name);
  }, [stage.name]);

  function commit() {
    const next = name.trim();
    setEditing(false);
    if (!next || next === stage.name) {
      setName(stage.name);
      return;
    }
    void renameStage(propertyId, stage.id, { name: next }).then((res) => {
      if (!res.ok) {
        setName(stage.name);
        toast.error(t("errors.generic"));
      }
      router.refresh();
    });
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-52 shrink-0 flex-col rounded-lg border bg-muted/30",
        isOver && "border-brand bg-brand-soft/50",
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span
          className={cn("size-1.5 shrink-0 rounded-full", toneDot(stage.color))}
        />
        {editing && canManage ? (
          <input
            value={name}
            autoFocus
            aria-label={t("rename")}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setName(stage.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          />
        ) : canManage ? (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-medium"
            onClick={() => setEditing(true)}
          >
            {stage.name}
          </button>
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {stage.name}
          </p>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("count", { count: cards.length })}
        </span>
      </div>
      {cards.length > 0 ? (
        <div className="flex flex-col gap-1.5 px-1.5 pb-1.5">
          {cards.map((card) => (
            <ApplicantCard
              key={card.id}
              card={card}
              canDrag={canManage}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <div className="min-h-8" />
      )}
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
        "flex w-full items-start gap-2 rounded-md border bg-card p-2 text-left transition-colors hover:border-foreground/15",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <PersonAvatar
        initials={initialsOf(card.fullName)}
        className="size-7 shrink-0 text-[10px]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {card.fullName}
          </span>
          {card.score != null ? (
            <Badge variant="info" className="shrink-0">
              {card.score}
            </Badge>
          ) : null}
        </span>
        {card.memberLine || card.email ? (
          <span className="block truncate text-xs text-muted-foreground">
            {card.memberLine ?? card.email}
          </span>
        ) : null}
        {card.summary ? (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
            {card.summary}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function toneDot(color: string | null) {
  switch (color) {
    case "brand":
      return "bg-brand";
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "info":
      return "bg-info";
    case "destructive":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}
