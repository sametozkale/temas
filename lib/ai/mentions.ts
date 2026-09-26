export const MENTION_KINDS = [
  "property",
  "person",
  "conversation",
  "application",
  "calendar",
  "task",
] as const;

export type MentionKind = (typeof MENTION_KINDS)[number];

export type AskEntity = {
  kind: MentionKind;
  id: string;
  title: string;
  href: string;
  /** When false, only URL/id matches chip this record — not the raw title. */
  matchName?: boolean;
  /** Earlier names still in saved messages. The chip shows `title`. */
  aliases?: string[];
};

export type MentionSegment =
  | { type: "text"; text: string }
  | {
      type: "mention";
      kind: MentionKind;
      title: string;
      href: string;
      id: string;
    };

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

const MARKDOWN_LINK_RE = new RegExp(
  String.raw`\[([^\]]+)\]\s*\(((?:https?:\/\/|\/)[^)\s]+)\)`,
  "g",
);
const BARE_URL_RE = /https?:\/\/[^\s)]+/g;
const RELATIVE_ENTITY_RE = new RegExp(
  String.raw`(^|[\s(])(/(?:properties|inbox)/${UUID}(?:/[^\s)]*)?)`,
  "g",
);

const PROPERTY_PATH = new RegExp(String.raw`^/properties/(${UUID})(?:/.*)?$`);
const INBOX_PATH = new RegExp(String.raw`^/inbox/(${UUID})$`);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUrlLike(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes("://")
  );
}

export function toAppPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith("/")
      ? new URL(trimmed, "http://temas.local")
      : new URL(trimmed);
    const path = (url.pathname.replace(/\/+$/, "") || "/") + url.search;
    if (classifyHref(path)) return path;
  } catch {
    return null;
  }
  return null;
}

export function classifyHref(
  href: string,
): { kind: MentionKind; id: string } | null {
  const path = href.split("?")[0] ?? href;
  const property = path.match(PROPERTY_PATH);
  if (property?.[1]) {
    if (path.includes("/applications") || path.endsWith("/pipeline")) {
      return { kind: "application", id: property[1] };
    }
    if (path.endsWith("/people")) {
      return { kind: "person", id: property[1] };
    }
    return { kind: "property", id: property[1] };
  }
  const inbox = path.match(INBOX_PATH);
  if (inbox?.[1]) return { kind: "conversation", id: inbox[1] };
  if (path === "/calendar") return { kind: "calendar", id: "calendar" };
  if (path === "/tasks" || path.startsWith("/tasks?")) {
    return { kind: "task", id: "tasks" };
  }
  return null;
}

function lookup(
  catalog: AskEntity[],
  href: string,
  classified: { kind: MentionKind; id: string },
  label: string,
): Extract<MentionSegment, { type: "mention" }> {
  const byId = catalog.find(
    (entity) => entity.id === classified.id && entity.kind === classified.kind,
  );
  const byHref = catalog.find((entity) => entity.href === href);
  const byLabel = catalog.find(
    (entity) =>
      entity.title.localeCompare(label, undefined, {
        sensitivity: "accent",
      }) === 0,
  );
  const personBound = boundPerson(catalog, href, classified.id, label);
  const record =
    classified.kind === "person"
      ? (personBound ??
        (byLabel?.kind === "person" ? byLabel : byId) ??
        byHref ??
        byLabel)
      : byLabel?.kind === "person"
        ? byLabel
        : (byId ??
          byHref ??
          (byLabel?.kind === classified.kind ? byLabel : undefined));
  const title = record
    ? record.title
    : !isUrlLike(label)
      ? label.trim()
      : fallbackTitle(classified.kind);
  return {
    type: "mention",
    kind: record?.kind ?? classified.kind,
    title,
    href: record?.href ?? href,
    id: record?.id ?? classified.id,
  };
}

function sameName(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/** The record this link points at, when the catalog can name exactly one. */
function boundPerson(
  catalog: AskEntity[],
  href: string,
  id: string,
  label: string,
) {
  const people = catalog.filter(
    (entity) =>
      entity.kind === "person" && (entity.href === href || entity.id === id),
  );
  const named = people.find((entity) => sameName(entity.title, label));
  if (named) return named;
  return people.length === 1 ? people[0] : undefined;
}

function fallbackTitle(kind: MentionKind) {
  switch (kind) {
    case "property":
      return "Property";
    case "person":
      return "Person";
    case "conversation":
      return "Conversation";
    case "application":
      return "Applicant";
    case "calendar":
      return "Calendar";
    case "task":
      return "Task";
  }
}

type Span = {
  start: number;
  end: number;
  mention: Extract<MentionSegment, { type: "mention" }>;
};

function overlaps(occupied: boolean[], start: number, end: number) {
  for (let i = start; i < end; i += 1) {
    if (occupied[i]) return true;
  }
  return false;
}

function mark(occupied: boolean[], start: number, end: number) {
  occupied.fill(true, start, end);
}

function pushSpan(spans: Span[], occupied: boolean[], span: Span) {
  if (span.start < 0 || span.end > occupied.length || span.start >= span.end) {
    return;
  }
  if (overlaps(occupied, span.start, span.end)) return;
  spans.push(span);
  mark(occupied, span.start, span.end);
}

function consumeDuplicateUrl(
  text: string,
  occupied: boolean[],
  from: number,
  href: string,
) {
  const rest = text.slice(from);
  const match = rest.match(/^\s*\(?https?:\/\/[^\s)]+\)?/);
  if (!match) return;
  const raw = match[0].match(/https?:\/\/[^\s)]+/)?.[0];
  if (!raw || toAppPath(raw) !== href) return;
  mark(occupied, from, from + match[0].length);
}

export function parseMentions(
  text: string,
  catalog: AskEntity[] = [],
): MentionSegment[] {
  if (!text) return [];
  const occupied = Array.from({ length: text.length }, () => false);
  const spans: Span[] = [];

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const rawHref = match[2];
    const index = match.index;
    if (rawHref == null || index == null) continue;
    const href = toAppPath(rawHref);
    const classified = href ? classifyHref(href) : null;
    if (!href || !classified) continue;
    const mention = lookup(catalog, href, classified, match[1] ?? "");
    pushSpan(spans, occupied, {
      start: index,
      end: index + match[0].length,
      mention,
    });
    consumeDuplicateUrl(text, occupied, index + match[0].length, mention.href);
    consumeDuplicateUrl(text, occupied, index + match[0].length, href);
  }

  for (const match of text.matchAll(BARE_URL_RE)) {
    const index = match.index;
    if (index == null) continue;
    const href = toAppPath(match[0]);
    const classified = href ? classifyHref(href) : null;
    if (!href || !classified) continue;
    pushSpan(spans, occupied, {
      start: index,
      end: index + match[0].length,
      mention: lookup(catalog, href, classified, match[0]),
    });
  }

  for (const match of text.matchAll(RELATIVE_ENTITY_RE)) {
    const path = match[2];
    const prefix = match[1] ?? "";
    const index = match.index;
    if (path == null || index == null) continue;
    const start = index + prefix.length;
    const href = toAppPath(path);
    const classified = href ? classifyHref(href) : null;
    if (!href || !classified) continue;
    pushSpan(spans, occupied, {
      start,
      end: start + path.length,
      mention: lookup(catalog, href, classified, path),
    });
  }

  const named = catalog
    .filter((entity) => entity.matchName !== false)
    .flatMap((entity) => {
      const labels = [entity.title, ...(entity.aliases ?? [])];
      return labels
        .map((label) => label.trim())
        .filter((label) => label.length >= 2)
        .map((label) => ({
          entity,
          label,
          live: sameName(label, entity.title),
        }));
    })
    .sort(
      (a, b) => b.label.length - a.label.length || Number(b.live) - Number(a.live),
    );

  for (const { entity, label } of named) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(label)}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of text.matchAll(pattern)) {
      const index = match.index;
      if (index == null) continue;
      pushSpan(spans, occupied, {
        start: index,
        end: index + match[0].length,
        mention: {
          type: "mention",
          kind: entity.kind,
          title: entity.title,
          href: entity.href,
          id: entity.id,
        },
      });
    }
  }

  spans.sort((a, b) => a.start - b.start);
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, span.start) });
    }
    segments.push(span.mention);
    cursor = span.end;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }
  return segments.filter(
    (segment) => segment.type === "mention" || segment.text.length > 0,
  );
}

/** Saved citations keep their old wording, but the chip uses the live record name. */
export function rememberRecordNames(
  catalog: AskEntity[],
  remembered: { kind: MentionKind; href: string; title: string; id?: string }[],
): AskEntity[] {
  if (remembered.length === 0) return catalog;
  const next = catalog.map((entity) => ({
    ...entity,
    aliases: entity.aliases ? [...entity.aliases] : undefined,
  }));
  const extra: AskEntity[] = [];
  for (const item of remembered) {
    const title = item.title.trim();
    if (!title) continue;
    const matches = next.filter(
      (entity) => entity.kind === item.kind && entity.href === item.href,
    );
    if (matches.length === 1) {
      const live = matches[0];
      if (!live || sameName(live.title, title)) continue;
      const aliases = new Set(live.aliases ?? []);
      aliases.add(title);
      live.aliases = [...aliases];
      continue;
    }
    if (matches.length > 0) continue;
    extra.push({
      kind: item.kind,
      id: item.id ?? item.href,
      title,
      href: item.href,
      matchName: true,
    });
  }
  return extra.length > 0 ? [...next, ...extra] : next;
}

export function currentRecordTitle(
  catalog: AskEntity[],
  href: string,
  fallback: string,
  kind?: MentionKind,
) {
  const matches = catalog.filter(
    (entity) => entity.href === href && (kind == null || entity.kind === kind),
  );
  return matches.length === 1 ? matches[0]!.title : fallback;
}

export function mentionHrefs(segments: MentionSegment[]) {
  return new Set(
    segments
      .filter(
        (segment): segment is Extract<MentionSegment, { type: "mention" }> =>
          segment.type === "mention",
      )
      .map((segment) => segment.href),
  );
}
