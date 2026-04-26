import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function ProSuccessPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-app-accent/15 ring-1 ring-app-accent/30">
            <CheckCircle2 className="h-8 w-8 text-app-accent" />
          </div>
          <h1 className="text-2xl font-bold text-app-fg">Welcome to Pro</h1>
          <p className="mt-3 text-[14px] leading-6 text-app-muted">
            Your subscription is active. You now have unlimited sessions every month.
          </p>
          <p className="mt-2 text-[12px] text-app-muted/60">
            Pro access activates within a few seconds. If your dashboard still shows a limit,
            refresh the profile page.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow shadow-app-accent/20 transition-all hover:opacity-90"
            >
              Continue to Study →
            </Link>
            <Link
              href="/profile"
              className="text-[12px] text-app-muted/60 transition-colors hover:text-app-muted"
            >
              View profile
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
