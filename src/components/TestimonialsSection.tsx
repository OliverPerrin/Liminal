const TESTIMONIALS = [
  {
    initials: "JK",
    name: "J.K.",
    role: "ML Engineer, ex-Meta",
    quote:
      "The 6-stage structure is exactly what I needed. I stopped trying to memorize definitions and started actually deriving things. Passed my loop at a top lab.",
  },
  {
    initials: "AP",
    name: "A.P.",
    role: "Research Scientist, Google DeepMind",
    quote:
      "The resume-grounded retrieval check is genuinely useful. It asked me about my specific transformer project and I realized I couldn't explain my own work precisely enough.",
  },
  {
    initials: "DM",
    name: "D.M.",
    role: "Applied Scientist, Amazon",
    quote:
      "I've tried every ML prep resource. This is the only one that actually forces you to understand the math before moving on. The stage structure doesn't let you fake it.",
  },
];

function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.448a1 1 0 00-1.175 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="border-y border-app-border bg-app-panel/30">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-app-muted/60">
            What Engineers Are Saying
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-app-border bg-app-panel p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-app-accent"
                  style={{ background: "rgba(16,185,129,0.12)" }}
                >
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-app-fg">{t.name}</p>
                  <p className="text-[12px] text-app-muted">{t.role}</p>
                </div>
              </div>
              <StarRating />
              <p className="mt-3 text-[13px] italic leading-7 text-app-muted">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
