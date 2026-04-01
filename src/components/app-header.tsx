"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/home", label: "Study" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
];

type AppHeaderProps = {
  studiedCount?: number;
};

export function AppHeader({ studiedCount }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <header className="z-20 border-b border-app-border bg-app-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex h-11 w-full items-center justify-between px-4">
        {/* Brand */}
        <Link
          href="/home"
          className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-app-fg transition-opacity hover:opacity-80"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-app-accent text-[10px] font-black text-white">
            LM
          </div>
          <span className="hidden sm:inline">LiminalML</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                pathname === link.href
                  ? "bg-app-accent/12 text-app-accent"
                  : "text-app-muted hover:bg-app-panel-2 hover:text-app-fg",
              )}
            >
              {link.label}
            </Link>
          ))}

          {studiedCount !== undefined && studiedCount > 0 && (
            <>
              <div className="mx-2 h-3.5 w-px bg-app-border" />
              <span className="rounded-full bg-app-panel-2 px-2.5 py-0.5 text-[11px] font-medium text-app-muted/70">
                {studiedCount} studied
              </span>
            </>
          )}

          <div className="mx-2 h-3.5 w-px bg-app-border" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
