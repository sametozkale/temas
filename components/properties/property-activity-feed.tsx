import { getTranslations } from "next-intl/server";

import { PersonAvatar } from "@/components/identity-marks";
import { Activity01Icon, Icon } from "@/components/icons";
import {
  formatActivityCopy,
  groupActivityByDay,
  type ActivityRow,
} from "@/lib/activity/present";
import { initialsOf } from "@/lib/auth-utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function PropertyActivityFeed({
  rows,
  timezone,
}: {
  rows: ActivityRow[];
  timezone: string;
}) {
  const t = await getTranslations("properties.activity");
  const tStatus = await getTranslations("properties.status");
  const tRel = await getTranslations("properties.people.relations");

  const groups = groupActivityByDay(rows, timezone, {
    today: t("group_today"),
    yesterday: t("group_yesterday"),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {groups.map((group) => (
        <section key={group.sortKey} className="space-y-1">
          <h2 className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <ul>
            {group.rows.map((row) => {
              const copy = formatActivityCopy(row, t, tStatus, tRel);
              const actor = row.actorName ?? t("system");
              const isSystem = !row.actorName;
              const absolute = formatDateTime(row.createdAt, timezone);

              return (
                <li key={row.id}>
                  <article
                    className={cn(
                      "flex gap-3 rounded-md px-2 py-2.5 transition-colors",
                      "hover:bg-muted/60",
                    )}
                  >
                    {isSystem ? (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon icon={Activity01Icon} size={16} />
                      </span>
                    ) : (
                      <PersonAvatar
                        src={row.actorAvatarUrl}
                        initials={initialsOf(row.actorName)}
                        className="size-8"
                        fallbackClassName="text-[11px]"
                      />
                    )}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm leading-snug">
                        <span className="font-medium text-foreground">
                          {actor}
                        </span>{" "}
                        <span className="text-foreground/85">{copy}</span>
                      </p>
                    </div>
                    <time
                      dateTime={row.createdAt.toISOString()}
                      title={absolute}
                      className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                    >
                      {formatRelative(row.createdAt)}
                    </time>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
