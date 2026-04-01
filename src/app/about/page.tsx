import Link from "next/link";
import { TOPIC_TAXONOMY } from "@/lib/topics";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { Logo } from "@/components/logo";

const STAGE_CARDS = [
  {
    n: 1,
    color: "#f59e0b",
    title: "Big Picture",
    desc: "2–3 sentences on what the concept solves and where it appears in real production systems. No jargon, no math — just the mental frame.",
  },
  {
    n: 2,
    color: "#2dd4bf",
    title: "Intuition + Visual",
    desc: "Core idea in plain language, then a structured diagram with tensor dimensions and data flow annotated. Mandatory for all DL architectures.",
  },
  {
    n: 3,
    color: "#818cf8",
    title: "The Math",
    desc: "Full step-by-step derivation with every term motivated. Not just what each symbol is, but what breaks if you remove it.",
  },
  {
    n: 4,
    color: "#38bdf8",
    title: "Implementation",
    desc: "Production-quality PyTorch with type annotations, every non-obvious line commented, and an explicit test snippet at the end.",
  },
  {
    n: 5,
    color: "#fb923c",
    title: "Interview Questions",
    desc: "4 graded questions: conceptual, applied, systems-level (latency/memory/scale), and failure modes. Ordered from warm-up to hard.",
  },
  {
    n: 6,
    color: "#c084fc",
    title: "Retrieval Check",
    desc: "Conversational drill. The AI asks, waits for your answer, then tells you precisely what was right, wrong, or missing — no score, just a senior researcher interviewing you.",
  },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Classical ML": "#f59e0b",
  "Deep Learning": "#818cf8",
  "Reinforcement Learning": "#2dd4bf",
  "Training Engineering": "#38bdf8",
  "Systems and MLOps": "#fb923c",
};

export default async function AboutPage() {
  const user = await getCurrentUser();
  const totalTopics = TOPIC_TAXONOMY.flatMap((d) => d.sections.flatMap((s) => s.topics)).length;

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      {user ? (
        <AppHeader />
      ) : (
        <header className="border-b border-app-border bg-app-panel/95 backdrop-blur-sm">
          <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-2 text-[13px] font-bold text-app-fg">
              <Logo size={22} className="text-app-accent" />
              LiminalML
            </div>
            <Link
              href="/auth"
              className="rounded-lg bg-app-accent px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </header>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-24 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-app-border bg-app-panel px-4 py-1.5 text-[12px] font-medium text-app-accent">
          <div className="h-1.5 w-1.5 rounded-full bg-app-accent" />
          Research Engineer · MLE · Research Scientist · Applied Scientist
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-app-fg sm:text-5xl">
          The structured path to your
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ML interview
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-app-muted">
          Upload your resume. Get personalized STAR stories. Study any ML/DL/RL topic through a
          structured 6-stage session — from intuition to derivation to production code — grounded in your
          own project experience.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={user ? "/home" : "/auth"}
            className="rounded-xl bg-app-accent px-8 py-3 text-[15px] font-semibold text-white shadow-lg shadow-app-accent/25 transition-all hover:opacity-90 hover:shadow-app-accent/40"
          >
            {user ? "Start studying" : "Start for free"}
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-app-border px-8 py-3 text-[15px] font-medium text-app-muted transition-colors hover:border-app-border/80 hover:text-app-fg"
          >
            How it works
          </a>
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────────────────── */}
      <section className="border-y border-app-border bg-app-panel/50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Not a chatbot",
                desc: "Every session follows a rigid 6-stage structure. You can't skip stages, and the AI won't let you rush the derivation.",
              },
              {
                title: "Grounded in your work",
                desc: "Your resume and STAR stories are injected into every session. The retrieval check asks about your specific implementation choices.",
              },
              {
                title: "Interview-calibrated depth",
                desc: "Calibrated to someone who has read the original papers and implemented models from scratch. Deeper, not shallower.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="mb-2 text-[14px] font-semibold text-app-fg">{item.title}</h3>
                <p className="text-[13px] leading-6 text-app-muted">{item.desc}</p>
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGE_CARDS.map((stage) => (
            <div
              key={stage.n}
              className="rounded-xl border border-app-border bg-app-panel p-5 transition-colors hover:border-[#3d3e5a]"
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
          <h3 className="mb-3 text-[14px] font-semibold text-app-fg">Between every stage</h3>
          <p className="text-[13px] leading-6 text-app-muted">
            After each stage the AI pauses:{" "}
            <em className="text-app-fg">"Ready to continue, or any questions before we move on?"</em>{" "}
            Type <em className="text-app-fg">"continue"</em> to advance, or ask any clarifying question
            — the AI answers it fully, then resumes from where it left off. A quick-action button also
            appears so you don&apos;t have to type.
          </p>
        </div>
      </section>

      {/* ── Personalization ──────────────────────────────────────────────── */}
      <section className="border-y border-app-border bg-app-panel/50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-app-fg">
                Sessions grounded in your experience
              </h2>
              <p className="mb-5 text-[14px] leading-7 text-app-muted">
                Upload your resume PDF and the platform extracts your experience, projects, and skills,
                then generates 6–8 STAR stories mapped to common behavioral questions.
              </p>
              <p className="mb-5 text-[14px] leading-7 text-app-muted">
                Every session injects your full profile into the system prompt. The Stage 6 retrieval
                check is grounded in your work — if you built an attention-based model, the AI asks about{" "}
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
                { label: "Profile injection", desc: "Full resume + stories injected into every session" },
                { label: "Grounded retrieval", desc: "Stage 6 references your specific project work" },
                { label: "Editable anytime", desc: "Update profile on Profile page, effective immediately" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-app-border bg-app-panel-2 p-4"
                >
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-app-accent" />
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
          <div className="rounded-xl border border-app-border bg-app-panel p-6">
            <h3 className="mb-3 text-[15px] font-semibold text-app-fg">Session history</h3>
            <p className="mb-4 text-[13px] leading-6 text-app-muted">
              Every session is saved. Click any past session in the history sidebar to reload the full
              conversation and continue from where you left off. The sidebar shows topic, stage reached, and date.
            </p>
            <p className="text-[13px] leading-6 text-app-muted">
              Topic mastery is tracked locally — a colored dot in the topic browser shows topics
              you&apos;ve studied and roughly how many sessions on each.
            </p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-panel p-6">
            <h3 className="mb-3 text-[15px] font-semibold text-app-fg">Revision cards</h3>
            <p className="mb-4 text-[13px] leading-6 text-app-muted">
              After Stage 2 or later, a "Revision card" button appears. Click it to generate a compact
              summary: core concept, key equations, the one implementation detail that distinguishes strong
              candidates, and the two most likely interview questions.
            </p>
            <p className="text-[13px] leading-6 text-app-muted">
              Designed for rapid pre-interview review — the night before your loop.
            </p>
          </div>
        </div>
      </section>

      {/* ── Topic taxonomy ────────────────────────────────────────────────── */}
      <section className="border-t border-app-border bg-app-panel/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-app-fg">
              {totalTopics} topics across 5 domains
            </h2>
            <p className="text-app-muted">
              Coverage for the full ML interview loop — classical models to LLM internals to RL theory.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOPIC_TAXONOMY.map((domain) => {
              const color = DOMAIN_COLORS[domain.name] ?? "#7c6aff";
              const topicCount = domain.sections.flatMap((s) => s.topics).length;
              return (
                <div
                  key={domain.name}
                  className="rounded-xl border border-app-border bg-app-panel p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <h3 className="text-[13px] font-semibold text-app-fg">{domain.name}</h3>
                    <span className="ml-auto rounded-full bg-app-panel-2 px-2 py-0.5 text-[11px] text-app-muted">
                      {topicCount}
                    </span>
                  </div>
                  {domain.sections.map((section) => (
                    <div key={`${domain.name}-${section.title}`} className="mb-3 last:mb-0">
                      {section.title && domain.sections.length > 1 && (
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-app-muted/50">
                          {section.title}
                        </p>
                      )}
                      <ul className="space-y-0.5">
                        {section.topics.map((topic) => (
                          <li key={topic} className="text-[12px] leading-5 text-app-muted/80">
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
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
            className="inline-block rounded-xl bg-app-accent px-10 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-app-accent/25 transition-all hover:opacity-90"
          >
            {user ? "Go to sessions" : "Create free account"}
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-app-border bg-app-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-app-muted">
            <Logo size={18} className="text-app-accent" />
            LiminalML
          </div>
          <p className="text-[12px] text-app-muted/50">
            Powered by Claude Sonnet · Supabase · Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
