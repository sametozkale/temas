import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type FeedbackEmailProps = {
  authorName: string;
  authorEmail: string;
  workspaceName: string;
  path?: string;
  body: string;
};

export function FeedbackEmail({
  authorName,
  authorEmail,
  workspaceName,
  path,
  body,
}: FeedbackEmailProps) {
  const from = authorName.trim() || authorEmail;
  return (
    <EmailLayout preview={`Feedback from ${from}`}>
      <Heading style={emailStyles.heading}>Product feedback</Heading>
      <Text style={emailStyles.muted}>
        {from} ({authorEmail}) in {workspaceName}
        {path ? ` · ${path}` : ""}
      </Text>
      <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
        {body}
      </Text>
    </EmailLayout>
  );
}

export default FeedbackEmail;
