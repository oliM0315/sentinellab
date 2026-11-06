import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { IncidentState, Severity } from "@/lib/sim/engine";

export const sevClass: Record<Severity, string> = {
  low: "text-sev-low border-sev-low/40 bg-sev-low/10",
  medium: "text-sev-medium border-sev-medium/40 bg-sev-medium/10",
  high: "text-sev-high border-sev-high/40 bg-sev-high/10",
  critical: "text-sev-critical border-sev-critical/50 bg-sev-critical/15",
};

export function SevBadge({ s }: { s: Severity }) {
  return <span className={cn("inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", sevClass[s])}>{s}</span>;
}

export function StateBadge({ s }: { s: IncidentState }) {
  const c = s === "INCIDENT_CRITICAL" ? sevClass.critical : s === "SUSPICIOUS" ? sevClass.medium : "text-primary border-primary/40 bg-primary/10";
  return <span className={cn("inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wider", c, s === "INCIDENT_CRITICAL" && "animate-pulse")}>{s}</span>;
}

export function Panel({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      {title && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ kicker, title, desc, right }: { kicker: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export const fmtTime = (ms: number) => new Date(ms).toISOString().slice(11, 19);
export const fmtDur = (ms?: number) => {
  if (ms === undefined || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
