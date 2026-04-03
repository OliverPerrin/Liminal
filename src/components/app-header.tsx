"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/home", label: "Study" },
  { href: "/practice", label: "Practice" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
];

type AppHeaderProps = {
  studiedCount?: number;
};

export function AppHeader({ studiedCount }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lml-theme");
    setIsDark(stored !== "light");
  }, []);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light", !isDark);
    localStorage.setItem("lml-theme", next);
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/about");
    router.refresh();
  }

  return (
    <header className="z-20 border-b border-app-border bg-app-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex h-11 w-full items-center justify-between px-4">
        {/* Brand */}
        <Link
          href="/home"
          className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-app-accent transition-opacity hover:opacity-80"
        >
          <Logo size={22} />
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
                  ? "bg-app-accent/10 text-app-accent"
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

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-md p-1.5 text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

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
