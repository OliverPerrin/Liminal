"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { startProCheckout } from "@/lib/checkout";
import { cn } from "@/lib/utils";

type UpgradePillProps = {
  className?: string;
};

/**
 * Small persistent upgrade entry-point for the app header. Self-fetches
 * is_pro on mount and renders nothing for Pro users (or while still loading)
 * so it never flickers.
 */
export function UpgradePill({ className }: UpgradePillProps) {
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || cancelled) {
        if (!cancelled) setIsPro(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cancelled) setIsPro(Boolean(data?.is_pro));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isPro === null || isPro) return null;

  async function handleClick() {
    setBusy(true);
    try {
      await startProCheckout();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Upgrade to LiminalML Pro"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-app-accent/30",
        "bg-gradient-to-r from-app-accent/10 to-[#818cf8]/10",
        "px-3 py-1 text-[12px] font-semibold text-app-accent",
        "transition-all hover:border-app-accent/55 hover:from-app-accent/20 hover:to-[#818cf8]/20",
        "disabled:opacity-60",
        className,
      )}
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{busy ? "Redirecting…" : "Upgrade"}</span>
    </button>
  );
}
