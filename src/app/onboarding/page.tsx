import { redirect } from "next/navigation";
import { requireOnboardingStatus, requireUser } from "@/lib/auth";
import { OnboardingView } from "@/components/onboarding-view";

export default async function OnboardingPage() {
  const user = await requireUser();
  const onboarded = await requireOnboardingStatus(user.id);

  if (onboarded) {
    redirect("/home");
  }

  return <OnboardingView userId={user.id} />;
}
