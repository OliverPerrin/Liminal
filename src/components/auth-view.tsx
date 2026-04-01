"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthView() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setNotice("Account created. Check your email to confirm your address before logging in.");
          setIsSignup(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Authentication failed";

      if (message.toLowerCase().includes("email not confirmed")) {
        setError("Email not confirmed. Check your inbox for the confirmation email.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
      {/* Brand mark */}
      <Link
        href="/about"
        className="mb-8 flex items-center gap-2.5 text-app-fg/80 transition-opacity hover:opacity-80"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent text-[11px] font-black text-white">
          LM
        </div>
        <span className="text-[15px] font-bold tracking-tight">LiminalML</span>
      </Link>

      <section className="w-full max-w-sm rounded-2xl border border-app-border bg-app-panel p-7 shadow-2xl shadow-black/30">
        <h1 className="text-[18px] font-bold text-app-fg">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[13px] text-app-muted">
          {isSignup
            ? "Start prepping for ML interviews in minutes."
            : "Sign in to continue your sessions."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-app-fg/80">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2.5 text-[14px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/60 focus:outline-none focus:ring-2 focus:ring-app-accent/20"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-app-fg/80">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2.5 text-[14px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/60 focus:outline-none focus:ring-2 focus:ring-app-accent/20"
              placeholder={isSignup ? "Minimum 8 characters" : "••••••••"}
            />
          </div>

          {notice && (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[13px] text-emerald-300">
              {notice}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-[13px] text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-app-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Working…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3 text-[12px] text-app-muted/50">
          <div className="h-px flex-1 bg-app-border" />
          or
          <div className="h-px flex-1 bg-app-border" />
        </div>

        <button
          type="button"
          onClick={() => {
            setIsSignup((prev) => !prev);
            setError(null);
            setNotice(null);
          }}
          className="mt-5 w-full text-center text-[13px] text-app-muted transition-colors hover:text-app-fg"
        >
          {isSignup ? "Already have an account? Sign in" : "New here? Create account"}
        </button>
      </section>

      <p className="mt-6 text-[12px] text-app-muted/40">
        ML interview prep powered by Claude ·{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-app-muted">
          Learn more
        </Link>
      </p>
    </main>
  );
}
