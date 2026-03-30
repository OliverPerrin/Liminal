import { redirect } from "next/navigation";
import { requireOnboardingStatus, requireUser } from "@/lib/auth";
import { HomeView } from "@/components/home-view";

export default async function HomePage() {
  const user = await requireUser();
  const onboarded = await requireOnboardingStatus(user.id);

  if (!onboarded) {
    redirect("/onboarding");
  }

  return <HomeView userId={user.id} />;
}
