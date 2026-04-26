"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-0.5 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                pathname === link.href
                  ? "bg-app-accent/10 text-app-accent"
                  : "text-[#b0b0b0] hover:bg-app-panel-2 hover:text-app-fg",
              )}
              style={pathname === link.href ? undefined : { color: "var(--nav-inactive, #b0b0b0)" }}
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

          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-md p-1.5 text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-app-border bg-app-panel/98 px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-[14px] transition-colors",
                  pathname === link.href
                    ? "bg-app-accent/10 text-app-accent"
                    : "text-app-fg/80 hover:bg-app-panel-2",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 border-t border-app-border" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] text-app-muted transition-colors hover:bg-app-panel-2 hover:text-app-fg"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
