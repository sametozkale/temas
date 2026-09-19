"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarView } from "@/lib/calendar/grid";

const ALL = "all";

export function CalendarFilters({
  properties,
  propertyId,
  agents,
  agentId,
  currentUserId,
  view,
  month,
  week,
}: {
  properties: { id: string; title: string }[];
  propertyId?: string;
  agents: { userId: string; name: string }[];
  agentId?: string;
  currentUserId?: string;
  view: CalendarView;
  month: string;
  week?: string;
}) {
  const t = useTranslations("calendar");
  const router = useRouter();

  function push(nextProperty: string, nextAgent: string) {
    const params = new URLSearchParams();
    params.set("view", view);
    if (view !== "list") params.set("month", month);
    if (week) params.set("week", week);
    if (nextProperty !== ALL) params.set("property", nextProperty);
    if (nextAgent !== ALL) params.set("agent", nextAgent);
    router.push(`/calendar?${params.toString()}`);
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <Select
        value={propertyId ?? ALL}
        onValueChange={(next) => push(next, agentId ?? ALL)}
      >
        <SelectTrigger
          size="sm"
          className="w-[160px] shrink-0"
          aria-label={t("filter_property")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("all_properties")}</SelectItem>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {agents.length > 0 ? (
        <Select
          value={agentId ?? ALL}
          onValueChange={(next) => push(propertyId ?? ALL, next)}
        >
          <SelectTrigger
            size="sm"
            className="w-[140px] shrink-0"
            aria-label={t("filter_agent")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("all_agents")}</SelectItem>
            {currentUserId ? (
              <SelectItem value="me">{t("mine")}</SelectItem>
            ) : null}
            {agents.map((agent) => (
              <SelectItem key={agent.userId} value={agent.userId}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
