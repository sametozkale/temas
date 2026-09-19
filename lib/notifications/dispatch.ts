import "server-only";

import type { ReactElement } from "react";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/integrations/resend";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp/client";
import { digitsPhone } from "@/lib/integrations/whatsapp/parse";
import { listWorkspaceNotifiers } from "@/lib/viewings/queries";

import {
  wantsNotification,
  type NotificationType,
} from "./prefs";

export type StaffNotifier = {
  email: string | null;
  phone: string | null;
  name: string | null;
  notificationPrefs: unknown;
};

export async function deliverStaffNotification(
  member: StaffNotifier,
  type: NotificationType,
  payload: {
    email?: { subject: string; react: ReactElement };
    whatsapp?: string;
  },
) {
  if (
    payload.email &&
    member.email &&
    wantsNotification(member.notificationPrefs, type, "email")
  ) {
    await sendEmail({
      to: member.email,
      subject: payload.email.subject,
      react: payload.email.react,
    });
  }

  const phone = member.phone ? digitsPhone(member.phone) : "";
  if (
    payload.whatsapp &&
    phone.length >= 7 &&
    wantsNotification(member.notificationPrefs, type, "whatsapp")
  ) {
    await sendWhatsAppText({ to: phone, body: payload.whatsapp });
  }
}

export async function notifyWorkspaceStaff(input: {
  workspaceId: string;
  assignedUserId?: string | null;
  type: NotificationType;
  email: (name: string) => { subject: string; react: ReactElement };
  whatsapp: (name: string) => string;
}) {
  const staff = await listWorkspaceNotifiers(
    db,
    input.workspaceId,
    input.assignedUserId,
  );
  for (const member of staff) {
    const name = member.name || member.email || "there";
    await deliverStaffNotification(member, input.type, {
      email: input.email(name),
      whatsapp: input.whatsapp(name),
    });
  }
}
