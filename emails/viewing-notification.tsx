import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type ViewingNotificationEmailProps = {
  recipientName: string;
  propertyTitle: string;
  prospectName: string;
  whenLabel: string;
  role: "agent" | "tenant";
};

export function ViewingNotificationEmail({
  recipientName,
  propertyTitle,
  prospectName,
  whenLabel,
  role,
}: ViewingNotificationEmailProps) {
  const preview =
    role === "agent"
      ? `New viewing: ${propertyTitle}`
      : `A viewing is scheduled at ${propertyTitle}`;
  return (
    <EmailLayout preview={preview}>
      <Heading style={emailStyles.heading}>
        {role === "agent" ? "New viewing booked" : "Viewing scheduled"}
      </Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, {prospectName} booked a viewing at{" "}
        <strong>{propertyTitle}</strong> for {whenLabel}.
      </Text>
    </EmailLayout>
  );
}

export default ViewingNotificationEmail;
