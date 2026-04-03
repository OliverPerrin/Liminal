import Link from "next/link";
import { Logo } from "@/components/logo";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-app-fg">
      <header className="border-b border-app-border bg-app-panel/95 backdrop-blur-sm">
        <div className="mx-auto flex h-11 w-full max-w-5xl items-center px-6">
          <Link href="/about">
            <Logo size={20} />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-4 text-2xl font-bold text-app-fg">Terms of Service</h1>
        <p className="text-app-muted">
          Terms of service coming soon. For questions, contact{" "}
          <a href="mailto:hello@liminalml.com" className="text-app-accent underline underline-offset-2">
            hello@liminalml.com
          </a>
        </p>
      </main>
    </div>
  );
}
