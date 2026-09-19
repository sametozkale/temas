import * as React from "react";

import { EntityChip } from "@/components/home/entity-chip";
import {
  parseMentions,
  type AskEntity,
  type MentionSegment,
} from "@/lib/ai/mentions";

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

function SegmentView({ segment }: { segment: MentionSegment }) {
  if (segment.type === "mention") {
    return (
      <EntityChip
        kind={segment.kind}
        title={segment.title}
        href={segment.href}
      />
    );
  }
  return <BoldText text={segment.text} />;
}

export function MessageBody({
  text,
  entities,
}: {
  text: string;
  entities: AskEntity[];
}) {
  const segments = parseMentions(text, entities);
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((segment, index) => (
        <SegmentView key={index} segment={segment} />
      ))}
    </>
  );
}
