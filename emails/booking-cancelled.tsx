import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type BookingCancelledEmailProps = {
  recipientName: string;
  propertyTitle: string;
  whenLabel: string;
};

export function BookingCancelledEmail({
  recipientName,
  propertyTitle,
  whenLabel,
}: BookingCancelledEmailProps) {
  return (
    <EmailLayout preview={`Viewing cancelled: ${propertyTitle}`}>
      <Heading style={emailStyles.heading}>Viewing cancelled</Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, the viewing at <strong>{propertyTitle}</strong> on{" "}
        {whenLabel} has been cancelled. The slot is available again.
      </Text>
    </EmailLayout>
  );
}

export default BookingCancelledEmail;
