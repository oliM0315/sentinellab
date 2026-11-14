import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StateBadge, fmtDur } from "@/components/soc/ui";
import { useSim } from "@/lib/sim/store";

export const Route = createFileRoute("/_authenticated/incidents/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Incident Queue — SentinelLab" },
      { name: "description", content: "Correlated incidents awaiting triage, investigation and response." },
      { property: "og:title", content: "Incident Queue — SentinelLab" },
      { property: "og:description", content: "Correlated incidents awaiting triage." },
    ],
  }),
  component: IncidentList,
});

function IncidentList() {
  const incidents = useSim((s) => s.engine.incidents);
  return (
    <div>
      <PageHeader kicker="Module 04" title="Incident Investigation" desc="Open an incident to review its timeline and evidence, record notes and launch containment." />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">ID</th><th>Title</th><th>State</th><th>Risk</th><th>Entities</th><th>Status</th><th>Verdict</th><th className="pr-3">TTD</th></tr>
          </thead>
          <tbody>
            {incidents.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No incidents yet — inject a scenario from the dashboard.</td></tr>
            )}
            {incidents.map((i) => (
              <tr key={i.id} className="border-b border-border/50 hover:bg-muted">
                <td className="p-3 font-mono text-xs"><Link to="/incidents/$id" params={{ id: i.id }} className="text-primary underline-offset-2 hover:underline">{i.id}</Link></td>
                <td className="max-w-xs truncate pr-3">{i.title}</td>
                <td className="pr-3"><StateBadge s={i.state} /></td>
                <td className="pr-3 font-mono">{i.risk}</td>
                <td className="pr-3 font-mono text-[11px] text-muted-foreground">{[...i.users, ...i.ips, ...i.assets].slice(0, 4).join(", ")}</td>
                <td className="pr-3 font-mono text-xs uppercase">{i.status}</td>
                <td className="pr-3 font-mono text-xs">{i.verdict ?? "—"}</td>
                <td className="pr-3 font-mono text-xs">{i.ackRealTs ? fmtDur(i.ackRealTs - i.firstEventRealTs) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
