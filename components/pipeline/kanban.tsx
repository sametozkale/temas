"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
import { stageToneDot } from "@/components/pipeline/stage-tone";
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
  email: string | null;
  summary: string | null;
  score: number | null;
};

/** Prefer the column under the pointer; fall back when the pointer is in a gap. */
const stageCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  if (underPointer.length > 0) return underPointer;
  return closestCorners(args);
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
  const [board, setBoard] = React.useState(cards);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  React.useEffect(() => {
    setBoard(cards);
  }, [cards]);

  const byStage = React.useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const card of board) {
      const list = card.stageId ? map.get(card.stageId) : undefined;
      if (list) list.push(card);
    }
    return map;
  }, [stages, board]);

  const activeCard = board.find((card) => card.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!canManage) return;
    const overId = event.over?.id ? String(event.over.id) : null;
    const appId = String(event.active.id);
    const from = event.active.data.current?.stageId as string | undefined;
    if (!overId) return;
    const overStage = stages.some((s) => s.id === overId)
      ? overId
      : (board.find((c) => c.id === overId)?.stageId ?? null);
    if (!overStage || overStage === from) return;
    const previous = board;
    setBoard((current) =>
      current.map((card) =>
        card.id === appId ? { ...card, stageId: overStage } : card,
      ),
    );
    startTransition(async () => {
      const res = await moveApplication(propertyId, appId, overStage);
      if (!res.ok) {
        setBoard(previous);
        toast.error(t("errors.generic"));
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}
      <DndContext
        id={`pipeline-${propertyId}`}
        sensors={sensors}
        collisionDetection={stageCollision}
        onDragStart={onDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
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
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeCard ? <CardFace card={activeCard} floating /> : null}
        </DragOverlay>
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
        "flex w-52 shrink-0 flex-col rounded-lg border bg-muted/30 transition-[border-color,background-color] duration-150",
        isOver && "border-brand bg-brand-soft/50",
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            stageToneDot(stage.color),
          )}
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
        <div className={cn("min-h-8 flex-1", isOver && "min-h-24")} />
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { stageId: card.stageId },
    disabled: !canDrag,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(card.id)}
      className={cn(
        "w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
    >
      <CardFace card={card} muted={isDragging} />
    </button>
  );
}

function CardFace({
  card,
  muted,
  floating,
}: {
  card: KanbanCard;
  muted?: boolean;
  floating?: boolean;
}) {
  const detail = card.summary;
  return (
    <span
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border-[0.5px] border-border bg-card p-2 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:bg-muted",
        muted && "opacity-40 hover:bg-card",
        floating &&
          "w-[12.25rem] cursor-grabbing hover:bg-card shadow-[0_8px_20px_rgb(0_0_0/0.08)]",
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
        {detail ? (
          <span className="block truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}