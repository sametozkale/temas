import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type ReminderDigestEmailProps = {
  recipientName: string;
  workspaceName: string;
  items: string[];
};

export function ReminderDigestEmail({
  recipientName,
  workspaceName,
  items,
}: ReminderDigestEmailProps) {
  return (
    <EmailLayout preview={`Needs attention in ${workspaceName}`}>
      <Heading style={emailStyles.heading}>Needs attention</Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, here is the daily digest for {workspaceName}.
      </Text>
      {items.map((item) => (
        <Text key={item} style={emailStyles.muted}>
          • {item}
        </Text>
      ))}
    </EmailLayout>
  );
}

export default ReminderDigestEmail;
