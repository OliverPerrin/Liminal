"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/home", label: "Home" },
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
    <header className="sticky top-0 z-20 border-b border-app-border bg-app-panel/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4">
        <Link href="/home" className="font-mono text-sm font-semibold tracking-tight text-app-accent">
          LiminalML
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-app-muted hover:bg-app-panel-2 hover:text-app-fg",
                pathname === link.href && "bg-app-panel-2 text-app-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-3 rounded-md border border-app-border px-3 py-1.5 text-xs text-app-muted hover:text-app-fg"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
