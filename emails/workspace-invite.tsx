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
  agent: "Emlakçı",
  assistant: "Asistan",
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
      preview={`${inviterName} seni ${workspaceName} çalışma alanına davet etti`}
    >
      <Heading style={emailStyles.heading}>
        {workspaceName} çalışma alanına davet
      </Heading>
      <Text style={emailStyles.text}>
        {inviterName}, seni <strong>{workspaceName}</strong> çalışma alanına{" "}
        <strong>{roleLabel[role]}</strong> rolüyle davet etti.
      </Text>
      <Button href={acceptUrl} style={emailStyles.button}>
        Daveti kabul et
      </Button>
      <Text style={{ ...emailStyles.muted, marginTop: 16 }}>
        Bağlantı {expiresInDays} gün geçerlidir. Buton çalışmazsa: {acceptUrl}
      </Text>
    </EmailLayout>
  );
}

export default WorkspaceInviteEmail;
