import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export function ApplicationReceivedEmail({
  recipientName,
  propertyTitle,
  applicantName,
}: {
  recipientName: string;
  propertyTitle: string;
  applicantName: string;
}) {
  return (
    <EmailLayout preview={`New application: ${propertyTitle}`}>
      <Heading style={emailStyles.heading}>New application</Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, {applicantName} submitted an application for{" "}
        <strong>{propertyTitle}</strong>. It is waiting in the New column of the
        pipeline.
      </Text>
    </EmailLayout>
  );
}

export default ApplicationReceivedEmail;
