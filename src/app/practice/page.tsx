import { redirect } from "next/navigation";
import { requireUser, requireOnboardingStatus } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PracticeView } from "@/components/practice-view";
import type { SessionMessage } from "@/lib/types";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; session_id?: string }>;
}) {
  const user = await requireUser();
  const onboarded = await requireOnboardingStatus(user.id);
  if (!onboarded) redirect("/onboarding");

  const params = await searchParams;
  const topic = params.topic ?? "";
  const sessionId = params.session_id ?? null;

  let initialMessages: SessionMessage[] = [];

  if (sessionId) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("sessions")
      .select("messages")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.messages && Array.isArray(data.messages)) {
      initialMessages = data.messages as SessionMessage[];
    }
  }

  return (
    <PracticeView
      userId={user.id}
      topic={topic}
      sessionId={sessionId}
      initialMessages={initialMessages}
    />
  );
}
