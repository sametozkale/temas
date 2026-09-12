import { Button, Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export type WorkspaceInviteEmailProps = {
  workspaceName: string;
  inviterName: string;
  role: "agent" | "assistant";
  acceptUrl: string;
  expiresInDays: number;
};

const roleLabel: Record<WorkspaceInviteEmailProps["role"], string> = {
  agent: "Agent",
  assistant: "Assistant",
};

export function WorkspaceInviteEmail({
  workspaceName,
  inviterName,
  role,
  acceptUrl,
  expiresInDays,
}: WorkspaceInviteEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to the ${workspaceName} workspace`}
    >
      <Heading style={emailStyles.heading}>
        You&apos;re invited to {workspaceName}
      </Heading>
      <Text style={emailStyles.text}>
        {inviterName} invited you to join <strong>{workspaceName}</strong> as{" "}
        <strong>{roleLabel[role]}</strong>.
      </Text>
      <Button href={acceptUrl} style={emailStyles.button}>
        Accept invitation
      </Button>
      <Text style={{ ...emailStyles.muted, marginTop: 16 }}>
        This link is valid for {expiresInDays} days. If the button doesn&apos;t
        work, open: {acceptUrl}
      </Text>
    </EmailLayout>
  );
}

export default WorkspaceInviteEmail;
