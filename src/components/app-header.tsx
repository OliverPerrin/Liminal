"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/home", label: "Sessions" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <header className="z-20 border-b border-app-border bg-app-panel">
      <div className="mx-auto flex h-12 w-full items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-app-accent">
          <span className="rounded bg-app-accent/10 px-1.5 py-0.5">LM</span>
          <span className="hidden sm:inline">LiminalML</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] text-app-muted transition-colors hover:bg-app-panel-2 hover:text-app-fg",
                pathname === link.href && "bg-app-accent/10 text-app-accent",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mx-2 h-4 w-px bg-app-border" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-app-muted transition-colors hover:bg-app-panel-2 hover:text-app-fg"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
