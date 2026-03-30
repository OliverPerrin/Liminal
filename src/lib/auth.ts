import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SUPABASE_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Supabase request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), SUPABASE_TIMEOUT_MS);

    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  return user;
}

export async function requireOnboardingStatus(userId: string) {
  const supabase = await getSupabaseServerClient();

  try {
    const result = await withTimeout(
      supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS,
    );

    return Boolean(result.data?.id);
  } catch {
    return false;
  }
}
