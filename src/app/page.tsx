import { redirect } from "next/navigation";
import { getCurrentUser, requireOnboardingStatus } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const isOnboarded = await requireOnboardingStatus(user.id);
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  redirect("/home");
}
