import { TOPIC_TAXONOMY } from "@/lib/topics";
import { AppHeader } from "@/components/app-header";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <h1 className="text-2xl font-semibold">About LiminalML</h1>
          <p className="mt-3 text-sm text-app-muted">
            LiminalML is an AI-powered ML interview prep platform for engineers targeting Research Engineer,
            MLE, Research Scientist, and Applied Scientist roles.
          </p>
        </section>

        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <h2 className="text-lg font-semibold">How Sessions Work</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-app-muted">
            <li>Big Picture</li>
            <li>Intuition and Visual (including SVG diagrams)</li>
            <li>Math Derivation</li>
            <li>Line-by-Line Implementation</li>
            <li>Common Interview Questions</li>
            <li>Retrieval Check with follow-up</li>
          </ol>
        </section>

        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <h2 className="text-lg font-semibold">Personalization</h2>
          <p className="mt-3 text-sm text-app-muted">
            Your resume, STAR stories, and additional context are used to ground technical questioning in your
            real project experience.
          </p>
        </section>

        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <h2 className="text-lg font-semibold">Topic Taxonomy</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {TOPIC_TAXONOMY.map((domain) => (
              <article key={domain.name} className="rounded-lg border border-app-border bg-app-panel-2 p-4">
                <h3 className="font-medium">{domain.name}</h3>
                <ul className="mt-2 space-y-1 text-xs text-app-muted">
                  {domain.sections.flatMap((section) =>
                    section.topics.map((topic) => <li key={`${domain.name}-${topic}`}>{topic}</li>),
                  )}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
