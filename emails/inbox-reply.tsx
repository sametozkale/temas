import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type InboxReplyEmailProps = {
  recipientName: string;
  subject: string;
  body: string;
};

export function InboxReplyEmail({
  recipientName,
  subject,
  body,
}: InboxReplyEmailProps) {
  return (
    <EmailLayout preview={subject}>
      <Heading style={emailStyles.heading}>{subject}</Heading>
      <Text style={emailStyles.muted}>Hi {recipientName},</Text>
      <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
        {body}
      </Text>
    </EmailLayout>
  );
}

export default InboxReplyEmail;
