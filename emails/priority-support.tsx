import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type PrioritySupportEmailProps = {
  authorName: string;
  authorEmail: string;
  userId: string;
  workspaceName: string;
  subject: string;
  body: string;
};

export function PrioritySupportEmail({
  authorName,
  authorEmail,
  userId,
  workspaceName,
  subject,
  body,
}: PrioritySupportEmailProps) {
  const from = authorName.trim() || authorEmail;
  return (
    <EmailLayout preview={`Priority support from ${from}`}>
      <Heading style={emailStyles.heading}>Priority support</Heading>
      <Text style={emailStyles.muted}>
        {from} ({authorEmail}) has Priority support.
      </Text>
      <Text style={emailStyles.muted}>
        User {userId} · {workspaceName}
      </Text>
      <Text style={emailStyles.text}>{subject}</Text>
      <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
        {body}
      </Text>
    </EmailLayout>
  );
}

export default PrioritySupportEmail;
