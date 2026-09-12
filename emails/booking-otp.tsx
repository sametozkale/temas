import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export function BookingOtpEmail({
  code,
  propertyTitle,
}: {
  code: string;
  propertyTitle: string;
}) {
  return (
    <EmailLayout preview={`Your viewing code is ${code}`}>
      <Heading style={emailStyles.heading}>Confirm your viewing</Heading>
      <Text style={emailStyles.text}>
        Use this code to confirm your viewing at{" "}
        <strong>{propertyTitle}</strong>. It expires in 10 minutes.
      </Text>
      <Text
        style={{
          ...emailStyles.heading,
          letterSpacing: "0.2em",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {code}
      </Text>
    </EmailLayout>
  );
}

export default BookingOtpEmail;
