import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type ReminderEmailProps = {
  recipientName: string;
  title: string;
  whenLabel: string;
  propertyTitle?: string;
};

export function ReminderEmail({
  recipientName,
  title,
  whenLabel,
  propertyTitle,
}: ReminderEmailProps) {
  return (
    <EmailLayout preview={title}>
      <Heading style={emailStyles.heading}>{title}</Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, this is a reminder
        {propertyTitle ? (
          <>
            {" "}
            for <strong>{propertyTitle}</strong>
          </>
        ) : null}{" "}
        at {whenLabel}.
      </Text>
    </EmailLayout>
  );
}

export default ReminderEmail;
