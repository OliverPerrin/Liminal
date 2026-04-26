import type { Metadata } from "next";
import Link from "next/link";
import { ML_TAXONOMY, SWE_TAXONOMY } from "@/lib/topics";
import { ML_STAGES } from "@/lib/stages";
import { TRACKS } from "@/lib/tracks";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThreeHero } from "@/components/three-hero";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { TopicCatalog } from "@/components/landing/topic-catalog";

export const metadata: Metadata = {
  title: "LiminalML — Structured prep for ML and SWE interviews",
  description:
    "Upload your resume. Get personalized STAR stories. Study ML, DL, RL, backend, frontend, and system design through a rigorous 6-stage session grounded in your own project experience.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "LiminalML — ML + SWE interview prep",
    description:
      "130+ topics across ML and SWE. 6-stage sessions. AI-personalized to your resume.",
    url: "/about",
    siteName: "LiminalML",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LiminalML — ML + SWE interview prep",
    description:
      "130+ topics across ML and SWE. 6-stage sessions. AI-personalized to your resume.",
  },
};

const DOMAIN_ACCENTS = [
  { label: "ML / Research", color: "#10b981" },
  { label: "Software Engineering", color: "#38bdf8" },
];

export default async function AboutPage() {
  const user = await getCurrentUser();
  const mlTopicCount = ML_TAXONOMY.flatMap((d) =>
    d.sections.flatMap((s) => s.topics),
  ).length;
  const sweTopicCount = SWE_TAXONOMY.flatMap((d) =>
    d.sections.flatMap((s) => s.topics),
  ).length;
  const totalTopics = mlTopicCount + sweTopicCount;
  const totalDomains = ML_TAXONOMY.length + SWE_TAXONOMY.length;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liminalml.com";

  // schema.org markup so AI/search summarizers know what kind of product this
  // is, what it costs, and where to find it.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "LiminalML",
        url: siteUrl,
        description:
          "Personalized AI-driven prep for ML, deep learning, RL, and software engineering interviews.",
      },
      {
        "@type": "SoftwareApplication",
        name: "LiminalML",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          `Structured ${totalTopics}-topic interview prep platform across ML, deep learning, reinforcement learning, and software engineering. Each session follows a rigorous 6-stage format and is personalized to the user's resume and STAR stories.`,
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "9",
            priceCurrency: "USD",
            description: "Unlimited monthly sessions",
          },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {user ? (
        <AppHeader />
      ) : (
        <header className="relative z-30 border-b border-app-border bg-app-panel/95 backdrop-blur-sm">
          <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Logo size={22} />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/auth"
                className="rounded-lg bg-app-accent px-4 py-1.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
              >
                Get started
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[640px] overflow-hidden">
        <ThreeHero />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(var(--hero-overlay-rgb),0.82) 0%, rgba(var(--hero-overlay-rgb),0.6) 60%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
        />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          {/* Left: copy + CTAs */}
          <div className="text-center lg:text-left">
            <div className="mb-5 flex justify-center lg:justify-start">
              <Logo size={28} />
            </div>
            <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-app-border bg-app-panel/80 px-4 py-1.5 text-[13px] font-medium text-app-accent backdrop-blur-sm">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-app-accent" />
              <span>ML / Research</span>
              <span aria-hidden="true" className="text-app-muted/50">·</span>
              <span>Backend</span>
              <span aria-hidden="true" className="text-app-muted/50">·</span>
              <span>Frontend</span>
              <span aria-hidden="true" className="text-app-muted/50">·</span>
              <span>System Design</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-app-fg sm:text-5xl lg:text-[56px]">
              The structured path to your
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ML or SWE interview
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-8 text-app-muted lg:mx-0">
              Upload your resume. Get personalized STAR stories. Pick an ML or SWE topic and study
              it through a rigorous 6-stage session — from intuition to internals to production
              code — grounded in your own project experience.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={user ? "/home" : "/auth"}
                className="rounded-xl bg-app-accent px-8 py-3 text-[15px] font-semibold text-white shadow-lg shadow-app-accent/25 transition-all hover:opacity-90 hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
              >
                {user ? "Start studying" : "Get started"}
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-app-border/70 bg-app-panel/60 px-8 py-3 text-[15px] font-medium text-app-fg/70 backdrop-blur-sm transition-colors hover:border-app-border hover:text-app-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Right: product shot */}
          <div className="hidden justify-center lg:flex">
            <ProductShowcase />
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section
        className="border-y border-app-border bg-app-panel/60 backdrop-blur-sm"
        aria-label="Platform statistics"
      >
        <div className="mx-auto max-w-5xl px-6 py-4">
          <dl className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span aria-hidden="true" className="font-mono text-[11px] text-app-muted/60">
                &lt;/&gt;
              </span>
              <dd className="font-bold text-app-fg">{totalTopics}+</dd>
              <dt className="text-app-muted">ML + SWE topics</dt>
            </div>
            <div aria-hidden="true" className="h-3.5 w-px bg-app-border" />
            <div className="flex items-center gap-2 text-[13px]">
              <span aria-hidden="true" className="font-mono text-[11px] text-app-muted/60">
                ⬡
              </span>
              <dd className="font-bold text-app-fg">6</dd>
              <dt className="text-app-muted">Session stages</dt>
            </div>
            <div aria-hidden="true" className="h-3.5 w-px bg-app-border" />
            <div className="flex items-center gap-3 text-[13px]">
              <dd className="flex items-center gap-1">
                <span className="sr-only">2 tracks: </span>
                {DOMAIN_ACCENTS.map((d) => (
                  <div
                    key={d.label}
                    title={d.label}
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ background: d.color }}
                  />
                ))}
              </dd>
              <dt className="text-app-muted">2 tracks · {totalDomains} domains</dt>
            </div>
            <div aria-hidden="true" className="h-3.5 w-px bg-app-border" />
            <div className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden="true"
                className="font-mono text-[11px] text-app-muted/60"
                style={{ opacity: 0.5 }}
              >
                ✦
              </span>
              <dt className="text-app-muted">AI-personalized to your resume</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Tracks ───────────────────────────────────────────────────────── */}
      <section className="border-b border-app-border bg-app-panel/30">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-app-fg">Two tracks. One study loop.</h2>
            <p className="text-app-muted">
              Pick what you&apos;re interviewing for — or flip between tracks mid-week.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TrackCard
              id="ml"
              topicCount={mlTopicCount}
              domainCount={ML_TAXONOMY.length}
              highlights={["Classical ML", "Deep Learning", "Reinforcement Learning", "Training & MLOps"]}
              blurb="For Research Engineer, MLE, Research Scientist, and Applied Scientist loops. Stage 3 is full math — derivations with every term motivated."
            />
            <TrackCard
              id="swe"
              topicCount={sweTopicCount}
              domainCount={SWE_TAXONOMY.length}
              highlights={["Frontend", "Backend", "System Design", "UI / UX", "CS Fundamentals"]}
              blurb="For senior SWE, backend, frontend, and fullstack loops. Stage 3 swaps math for internals: data structures, complexity, tradeoffs, and failure modes."
            />
          </div>
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────────────────── */}
      <section className="border-b border-app-border bg-app-panel/30">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: "⊘",
                title: "Not a chatbot",
                desc: "Every session follows a rigid 6-stage structure. You can't skip stages, and the AI won't let you rush the derivation or the system design.",
              },
              {
                icon: "◈",
                title: "Grounded in your work",
                desc: "Your resume and STAR stories are injected into every session. The retrieval check asks about your specific implementation choices.",
              },
              {
                icon: "▲",
                title: "Interview-calibrated depth",
                desc: "Calibrated to someone who has read the papers or shipped the systems. Deeper, not shallower.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-[18px] text-app-accent/60">
                  {item.icon}
                </span>
                <div>
                  <h3 className="mb-2 text-[14px] font-semibold text-app-fg">{item.title}</h3>
                  <p className="text-[13px] leading-6 text-app-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6-stage breakdown ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-app-fg">The 6-stage session structure</h2>
          <p className="text-app-muted">
            Every topic. Every session. Always in order. Never compressed.
          </p>
          <p className="mt-2 text-[12px] text-app-muted/60">
            Shown: ML track. The SWE track swaps Stage 3 &ldquo;Math&rdquo; for
            &ldquo;Internals &amp; Complexity&rdquo;.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ML_STAGES.map((stage) => (
            <div
              key={stage.n}
              className="rounded-xl border border-app-border bg-app-panel p-5 transition-all hover:[border-color:var(--card-hover-border)] hover:[box-shadow:var(--card-hover-shadow)]"
              style={{ borderLeft: `3px solid ${stage.color}` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: stage.color, color: "#0e0f14" }}
                >
                  {stage.n}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: stage.color }}>
                  {stage.title}
                </span>
              </div>
              <p className="text-[13px] leading-6 text-app-muted">{stage.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-app-border bg-app-panel p-6">
          <h3 className="mb-3 text-[14px] font-medium text-app-fg">Between every stage</h3>
          <p className="text-[13px] leading-6 text-app-muted">
            After each stage the AI pauses:{" "}
            <em className="text-app-fg">
              &ldquo;Ready to continue, or any questions before we move on?&rdquo;
            </em>{" "}
            Type <em className="text-app-fg">&ldquo;continue&rdquo;</em> to advance, or ask any
            clarifying question — the AI answers it fully, then resumes from where it left off. A
            quick-action button also appears so you don&apos;t have to type.
          </p>
        </div>
      </section>

      <TestimonialsSection />

      {/* ── Personalization ──────────────────────────────────────────────── */}
      <section className="border-y border-app-border bg-app-panel/50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-app-fg">
                Sessions grounded in your experience
              </h2>
              <p className="mb-5 text-[14px] leading-7 text-app-muted">
                Upload your resume PDF and the platform extracts your experience, projects, and
                skills, then generates 6–8 STAR stories mapped to common behavioral questions.
              </p>
              <p className="mb-5 text-[14px] leading-7 text-app-muted">
                Every session injects your full profile into the system prompt. The Stage 6
                retrieval check is grounded in your work — if you built an attention-based model or
                shipped a rate-limited service, the AI asks about{" "}
                <em className="text-app-fg">your</em> implementation choices, not a generic one.
              </p>
              <p className="text-[14px] leading-7 text-app-muted">
                Edit your STAR stories and extra context at any time on the Profile page. Changes
                apply to the next session immediately.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Resume upload", desc: "PDF → extracted text → STAR story generation" },
                {
                  label: "Profile injection",
                  desc: "Full resume + stories injected into every session",
                },
                {
                  label: "Grounded retrieval",
                  desc: "Stage 6 references your specific project work",
                },
                {
                  label: "Editable anytime",
                  desc: "Update profile on Profile page, effective immediately",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-app-border bg-app-panel-2 p-4 transition-colors hover:border-app-accent/20"
                >
                  <div
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-app-accent"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-app-fg">{item.label}</p>
                    <p className="text-[12px] text-app-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Session history + revision cards ─────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-app-panel p-6 transition-colors hover:[border-color:var(--card-hover-border)]">
            <h3 className="mb-3 text-xl font-medium text-app-fg">Session history</h3>
            <p className="mb-4 text-[13px] leading-6 text-app-muted">
              Every session is saved. Click any past session in the history sidebar to reload the
              full conversation and continue from where you left off. The sidebar shows topic,
              stage reached, and date.
            </p>
            <p className="text-[13px] leading-6 text-app-muted">
              Topic mastery is tracked locally — a colored dot in the topic browser shows topics
              you&apos;ve studied and roughly how many sessions on each.
            </p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-panel p-6 transition-colors hover:[border-color:var(--card-hover-border)]">
            <h3 className="mb-3 text-xl font-medium text-app-fg">Revision cards</h3>
            <p className="mb-4 text-[13px] leading-6 text-app-muted">
              After Stage 2 or later, a &ldquo;Revision card&rdquo; button appears. Click it to
              generate a compact summary: core concept, key equations or tradeoffs, the one
              implementation detail that distinguishes strong candidates, and the two most likely
              interview questions.
            </p>
            <p className="text-[13px] leading-6 text-app-muted">
              Designed for rapid pre-interview review — the night before your loop.
            </p>
          </div>
        </div>
      </section>

      {/* ── Topic catalog ─────────────────────────────────────────────────── */}
      <section className="border-t border-app-border bg-app-panel/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <TopicCatalog />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-app-border">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold text-app-fg">Start preparing today</h2>
          <p className="mx-auto mb-10 max-w-md text-app-muted">
            Upload your resume and run your first session in under 5 minutes.
          </p>
          <Link
            href={user ? "/home" : "/auth"}
            className="inline-block rounded-xl bg-app-accent px-10 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-app-accent/25 transition-all hover:opacity-90 hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
          >
            {user ? "Go to sessions" : "Get started"}
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-app-border bg-app-panel">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo size={18} />
              <p className="mt-2 text-[12px] text-app-muted/70">
                The structured path to your ML or SWE interview
              </p>
              <p className="mt-1 text-[11px] text-app-muted/40">© 2026 LiminalML</p>
            </div>
            <div className="flex flex-col gap-1.5 text-[12px]">
              <Link
                href="/privacy"
                className="text-app-muted/60 transition-colors hover:text-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-app-muted/60 transition-colors hover:text-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:hello@liminalml.com"
                className="text-app-muted/60 transition-colors hover:text-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-app-border pt-4 text-center">
            <p className="text-[11px] text-app-muted/40">
              Powered by Claude Sonnet · Supabase · Next.js
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrackCard({
  id,
  topicCount,
  domainCount,
  highlights,
  blurb,
}: {
  id: "ml" | "swe";
  topicCount: number;
  domainCount: number;
  highlights: string[];
  blurb: string;
}) {
  const meta = TRACKS[id];
  return (
    <div
      className="rounded-2xl border border-app-border bg-app-panel p-6 transition-colors hover:[border-color:var(--card-hover-border)]"
      style={{ borderTop: `3px solid ${meta.accent}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: meta.accent }}
        />
        <h3 className="text-[14px] font-semibold text-app-fg">{meta.label}</h3>
        <span className="ml-auto rounded-full bg-app-panel-2 px-2 py-0.5 text-[11px] text-app-muted">
          {topicCount} topics · {domainCount} domains
        </span>
      </div>
      <p className="mb-4 text-[12.5px] leading-6 text-app-muted">{blurb}</p>
      <div className="flex flex-wrap gap-1.5">
        {highlights.map((h) => (
          <span
            key={h}
            className="rounded-full border border-app-border bg-app-panel-2 px-2.5 py-0.5 text-[11px] text-app-muted"
          >
            {h}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-app-muted/60">
        Roles: {meta.roles.join(" · ")}
      </p>
    </div>
  );
}
