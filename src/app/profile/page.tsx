import { redirect } from "next/navigation";
import { requireOnboardingStatus, requireUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";

export default async function ProfilePage() {
  const user = await requireUser();
  const onboarded = await requireOnboardingStatus(user.id);

  if (!onboarded) {
    redirect("/onboarding");
  }

  return <ProfileView userId={user.id} />;
}
