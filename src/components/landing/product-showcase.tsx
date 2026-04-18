import { ML_STAGES } from "@/lib/stages";

/**
 * Static, non-interactive mock of a live session. Lives in the hero's right
 * slot to give the page a concrete product shot rather than another gradient.
 */
export function ProductShowcase() {
  const currentStage = 3;

  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-app-border bg-app-panel/95 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-sm"
    >
      {/* Fake chrome */}
      <div className="flex items-center gap-2 border-b border-app-border/80 bg-app-panel-2/60 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#f87171]/70" />
        <span className="h-2 w-2 rounded-full bg-[#fbbf24]/70" />
        <span className="h-2 w-2 rounded-full bg-[#34d399]/70" />
        <span className="ml-2 truncate text-[11px] font-medium text-app-muted/70">
          Attention Mechanisms · 6-stage session
        </span>
      </div>

      {/* Stage progress strip */}
      <div className="flex items-center gap-1 border-b border-app-border/80 bg-app-panel/70 px-3 py-2">
        {ML_STAGES.map((stage, i) => {
          const isDone = stage.n < currentStage;
          const isCurrent = stage.n === currentStage;
          return (
            <div key={stage.n} className="flex items-center gap-1">
              <span
                className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={
                  isCurrent
                    ? {
                        background: `${stage.color}1f`,
                        color: stage.color,
                        border: `1px solid ${stage.color}55`,
                      }
                    : isDone
                    ? {
                        background: "transparent",
                        color: "#5b5c76",
                        border: "1px solid #2b2c40",
                      }
                    : {
                        background: "transparent",
                        color: "#32334a",
                        border: "1px dashed #1e1f2d",
                      }
                }
              >
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold"
                  style={
                    isCurrent
                      ? { background: stage.color, color: "#0e0f14" }
                      : isDone
                      ? { background: "#2b2c40", color: "#0e0f14" }
                      : { background: "transparent" }
                  }
                >
                  {stage.n}
                </span>
                {isCurrent && <span>{stage.short}</span>}
              </span>
              {i < ML_STAGES.length - 1 && (
                <span
                  className="h-px w-2"
                  style={{ background: isDone ? "#2b2c40" : "#1a1b28" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Chat body */}
      <div className="space-y-3 p-4">
        <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-app-panel-2 px-3 py-2 text-[12px] leading-5 text-app-fg/90 ring-1 ring-app-border">
          Walk me through scaled dot-product attention — math first.
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
              style={{ background: "#818cf8", color: "#0e0f14" }}
            >
              Stage 3
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "#818cf8" }}>
              The Math
            </span>
          </div>
          <div className="rounded-lg bg-app-bg/60 p-3 font-mono text-[11px] leading-5 text-app-fg/80 ring-1 ring-app-border/60">
            <span className="text-app-muted/70">{`// given Q, K, V ∈ ℝ^(n × d_k)`}</span>
            <br />
            <span>
              Attention(Q, K, V) = softmax
              <span className="text-app-muted/60">{"("}</span>
              <span className="text-[#2dd4bf]">QKᵀ</span>
              <span className="text-app-muted/60"> / </span>
              <span className="text-[#f59e0b]">√d_k</span>
              <span className="text-app-muted/60">{")"}</span> V
            </span>
          </div>
          <p className="text-[11.5px] leading-5 text-app-muted/90">
            The <span className="text-app-fg">√d_k</span> scaling keeps logits in a regime where
            softmax still has useful gradient — without it, large dot products saturate the
            softmax and gradients vanish.
          </p>
        </div>

        {/* Fake input */}
        <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-bg/80 px-3 py-1.5 text-[11px] text-app-muted/60">
          <span className="flex-1 truncate">continue</span>
          <span className="font-mono text-[10px] text-app-muted/40">⏎</span>
        </div>
      </div>
    </div>
  );
}
