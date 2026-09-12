"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  deleteInventoryItem,
  saveInventoryItem,
  type PropertyActionResult,
} from "@/app/(app)/properties/actions";
import { EmptyState } from "@/components/empty-state";
import {
  Delete02Icon,
  Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Sofa01Icon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CONDITIONS } from "@/lib/db/schema/properties";

export type InventoryRow = {
  id: string;
  name: string;
  quantity: number;
  condition: (typeof INVENTORY_CONDITIONS)[number] | null;
  note: string | null;
};

const CONDITION_TONE = {
  new: "success",
  good: "brand",
  fair: "warning",
  poor: "destructive",
} as const;

export function InventorySection({
  propertyId,
  items,
  canEdit,
}: {
  propertyId: string;
  items: InventoryRow[];
  canEdit: boolean;
}) {
  const t = useTranslations("properties.inventory");
  const router = useRouter();
  const [editing, setEditing] = React.useState<InventoryRow | null | "new">(
    null,
  );
  const [, startTransition] = React.useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canEdit ? (
          <Button variant="pill" size="sm" onClick={() => setEditing("new")}>
            <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
            {t("add")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Sofa01Icon}
          title={t("empty_title")}
          description={t("empty_description")}
          action={
            canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing("new")}
              >
                {t("add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="w-24 text-right">
                  {t("quantity")}
                </TableHead>
                <TableHead className="w-32">{t("condition")}</TableHead>
                <TableHead>{t("note")}</TableHead>
                {canEdit ? <TableHead className="w-20" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell>
                    {item.condition ? (
                      <Badge variant={CONDITION_TONE[item.condition]}>
                        {t(`conditions.${item.condition}`)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("conditions.unset")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">
                    {item.note}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t("edit")}
                          onClick={() => setEditing(item)}
                        >
                          <Icon icon={PencilEdit01Icon} size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t("delete")}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await deleteInventoryItem(
                                propertyId,
                                item.id,
                              );
                              if (res.ok) toast.success(t("deleted"));
                              router.refresh();
                            })
                          }
                        >
                          <Icon icon={Delete02Icon} size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {editing !== null ? (
        <InventoryDialog
          propertyId={propertyId}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function InventoryDialog({
  propertyId,
  item,
  onClose,
}: {
  propertyId: string;
  item: InventoryRow | null;
  onClose: () => void;
}) {
  const t = useTranslations("properties.inventory");
  const router = useRouter();
  const action = saveInventoryItem.bind(null, propertyId, item?.id ?? null);
  const [state, formAction, pending] = useActionState<
    PropertyActionResult | undefined,
    FormData
  >(action, undefined);
  const [condition, setCondition] = React.useState<string>(
    item?.condition ?? "unset",
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("saved"));
      router.refresh();
      onClose();
    }
  }, [state, t, router, onClose]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{item ? t("edit_title") : t("add_title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("description")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors?.name ? true : undefined}>
              <FieldLabel htmlFor="inv-name">{t("name")}</FieldLabel>
              <Input
                id="inv-name"
                name="name"
                defaultValue={item?.name ?? ""}
                autoFocus
                required
              />
              {errors?.name ? (
                <FieldError>{t("errors.name")}</FieldError>
              ) : null}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={errors?.quantity ? true : undefined}>
                <FieldLabel htmlFor="inv-qty">{t("quantity")}</FieldLabel>
                <Input
                  id="inv-qty"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={item?.quantity ?? 1}
                />
                {errors?.quantity ? (
                  <FieldError>{t("errors.quantity")}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="inv-condition">
                  {t("condition")}
                </FieldLabel>
                <input
                  type="hidden"
                  name="condition"
                  value={condition === "unset" ? "" : condition}
                />
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="inv-condition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">
                      {t("conditions.unset")}
                    </SelectItem>
                    {INVENTORY_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`conditions.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="inv-note">{t("note")}</FieldLabel>
              <Textarea
                id="inv-note"
                name="note"
                rows={3}
                defaultValue={item?.note ?? ""}
                placeholder={t("note_placeholder")}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
