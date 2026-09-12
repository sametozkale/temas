import { Button, Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type BookingConfirmationEmailProps = {
  recipientName: string;
  propertyTitle: string;
  whenLabel: string;
  address?: string | null;
  icsUrl?: string;
  cancelUrl: string;
};

export function BookingConfirmationEmail({
  recipientName,
  propertyTitle,
  whenLabel,
  address,
  icsUrl,
  cancelUrl,
}: BookingConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Viewing confirmed: ${propertyTitle}`}>
      <Heading style={emailStyles.heading}>Your viewing is booked</Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, your viewing at <strong>{propertyTitle}</strong> is
        confirmed for {whenLabel}.
      </Text>
      {address ? <Text style={emailStyles.muted}>{address}</Text> : null}
      {icsUrl ? (
        <Button href={icsUrl} style={emailStyles.button}>
          Add to calendar
        </Button>
      ) : null}
      <Text style={{ ...emailStyles.muted, marginTop: 16 }}>
        Need to cancel? {cancelUrl}
      </Text>
    </EmailLayout>
  );
}

export default BookingConfirmationEmail;
