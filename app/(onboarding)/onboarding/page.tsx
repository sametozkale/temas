import { redirect } from "next/navigation";

import { hasAnyWorkspace, requirePersistedUser } from "@/lib/auth";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requirePersistedUser("/onboarding");
  if (await hasAnyWorkspace(user.id)) {
    redirect("/home");
  }
  return <OnboardingForm defaultEmail={user.email} />;
}
