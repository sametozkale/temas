import { Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export function OwnerDecisionEmail({
  recipientName,
  propertyTitle,
  applicantName,
  decision,
}: {
  recipientName: string;
  propertyTitle: string;
  applicantName: string;
  decision: "approve" | "request_changes";
}) {
  const approved = decision === "approve";
  return (
    <EmailLayout
      preview={
        approved
          ? `Owner approved ${applicantName}`
          : `Owner requested changes on ${applicantName}`
      }
    >
      <Heading style={emailStyles.heading}>
        {approved ? "Owner approved an applicant" : "Owner requested changes"}
      </Heading>
      <Text style={emailStyles.text}>
        Hi {recipientName}, the owner reviewed {applicantName} for{" "}
        <strong>{propertyTitle}</strong>
        {approved
          ? " and approved them. They are now in Approved by Owner."
          : " and asked for changes. They are back in Reviewing."}
      </Text>
    </EmailLayout>
  );
}

export default OwnerDecisionEmail;
