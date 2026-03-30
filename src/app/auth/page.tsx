import { redirect } from "next/navigation";
import { getCurrentUser, requireOnboardingStatus } from "@/lib/auth";
import { AuthView } from "@/components/auth-view";

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    const onboarded = await requireOnboardingStatus(user.id);
    redirect(onboarded ? "/home" : "/onboarding");
  }

  return <AuthView />;
}
