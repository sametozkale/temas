import { redirect } from "next/navigation";

import { hasAnyWorkspace, requireUser } from "@/lib/auth";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (await hasAnyWorkspace(user.id)) {
    redirect("/home");
  }
  return <OnboardingForm defaultEmail={user.email} />;
}
