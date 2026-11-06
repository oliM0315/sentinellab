import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PageHeader, SevBadge, StateBadge, fmtDur, fmtTime } from "@/components/soc/ui";
import { ResponsePanel } from "@/components/soc/ResponsePanel";
import { actions, useSim } from "@/lib/sim/store";
import type { SimEvent } from "@/lib/sim/engine";

export const Route = createFileRoute("/incidents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} Investigation — SentinelLab` },
      { name: "description", content: "Incident timeline, evidence, analyst notes and response controls." },
      { property: "og:title", content: `${params.id} — SentinelLab` },
      { property: "og:description", content: "Incident investigation workspace." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const inc = useSim((s) => s.engine.incidents.find((i) => i.id === id));
  const allEvents = useSim((s) => s.engine.events);
  const allAlerts = useSim((s) => s.engine.alerts);
  const alerts = allAlerts.filter((a) => a.incidentId === id);
  const acts = useSim((s) => s.engine.actions);
  const [note, setNote] = useState("");
  const [ev, setEv] = useState<SimEvent | null>(null);

  if (!inc) {
    return (
      <div>
        <p className="text-muted-foreground">Incident {id} not found (the lab may have been reset).</p>
        <Link to="/incidents" className="text-primary">← back to queue</Link>
      </div>
    );
  }
  const keys = new Set([...inc.users, ...inc.ips, ...inc.assets]);
  // timeline: incident events + any later blocked events touching the same entities
  const timeline = allEvents
    .filter((e) => inc.eventIds.includes(e.id) || (e.status === "BLOCKED_BY_POLICY" && [e.user, e.src_ip, e.asset, e.dst_ip].some((k) => k && keys.has(k))))
    .sort((a, b) => a.ts - b.ts);
  const myActs = acts.filter((a) => a.incidentId === id);

  return (
    <div>
      <Link to="/incidents" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Incident queue</Link>
      <PageHeader
        kicker={`${inc.id} · risk ${inc.risk}/100`}
        title={inc.title}
        desc={`MITRE: ${inc.techniques.join(", ")} · Tactics: ${inc.tactics.join(" → ")}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge s={inc.state} />
            {!inc.ackRealTs && <Button size="sm" onClick={() => actions.acknowledge(inc.id)}><Eye className="h-4 w-4" /> Acknowledge & investigate</Button>}
            <Button size="sm" variant={inc.verdict === "TP" ? "default" : "outline"} onClick={() => actions.setVerdict(inc.id, "TP")}>True positive</Button>
            <Button size="sm" variant={inc.verdict === "FP" ? "default" : "outline"} onClick={() => actions.setVerdict(inc.id, "FP")}>False positive</Button>
            <Button size="sm" variant="outline" onClick={() => actions.setStatus(inc.id, "closed")} disabled={inc.status === "closed"}>Close</Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Status", inc.status.toUpperCase()],
          ["Alerts", inc.alertIds.length],
          ["Time to detect", inc.ackRealTs ? fmtDur(inc.ackRealTs - inc.firstEventRealTs) : "pending"],
          ["Time to respond", inc.containedRealTs && inc.ackRealTs ? fmtDur(inc.containedRealTs - inc.ackRealTs) : "pending"],
          ["Entities", keys.size],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-card px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
            <p className="mt-0.5 font-mono text-lg">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Event timeline">
            <ol className="relative max-h-[420px] space-y-0 overflow-auto border-l border-border pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="relative py-1.5">
                  <span className={`absolute -left-[21px] top-3 h-2 w-2 rounded-full ${e.status === "BLOCKED_BY_POLICY" ? "bg-sev-medium" : e.alertIds.length ? "bg-sev-critical" : "bg-muted-foreground"}`} />
                  <button onClick={() => setEv(e)} className="flex w-full gap-3 text-left font-mono text-xs hover:text-primary">
                    <span className="text-muted-foreground">{fmtTime(e.ts)}</span>
                    <span className="w-24 shrink-0 text-primary">{e.asset}</span>
                    <span className="flex-1">{e.message}</span>
                    {e.status === "BLOCKED_BY_POLICY" && <span className="text-sev-medium">BLOCKED_BY_POLICY</span>}
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Evidence viewer">
              {ev ? (
                <div className="space-y-2 font-mono text-xs">
                  <p>{ev.id} · {ev.source}/{ev.type}</p>
                  <pre className="whitespace-pre-wrap break-all rounded bg-background p-2">{ev.raw}</pre>
                  {ev.blockedBy && <p className="text-sev-medium">Blocked: {ev.blockedBy}</p>}
                  <p className="text-muted-foreground">user={ev.user ?? "-"} src_ip={ev.src_ip ?? "-"} dst={ev.dst_ip ?? "-"}:{ev.port ?? "-"} path={ev.path ?? "-"}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click a timeline entry to view its raw evidence.</p>
              )}
            </Panel>
            <Panel title="Triggered alerts">
              <div className="max-h-60 space-y-2 overflow-auto">
                {alerts.map((a) => (
                  <div key={a.id} className="text-xs">
                    <div className="flex items-center gap-2"><SevBadge s={a.severity} /><span className="font-mono text-accent">{a.mitre}</span><span className="text-muted-foreground">{a.ruleName}</span></div>
                    <p className="mt-0.5">{a.summary}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel title="Analyst notes">
            <div className="space-y-2">
              {inc.notes.map((n, i) => (
                <p key={i} className="rounded bg-background p-2 text-sm"><span className="mr-2 font-mono text-[11px] text-muted-foreground">{new Date(n.realTs).toLocaleTimeString()}</span>{n.text}</p>
              ))}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hypothesis, pivots, findings…" rows={3} />
              <Button size="sm" onClick={() => { actions.addNote(inc.id, note); setNote(""); }}>Add note</Button>
            </div>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Response (SOAR)"><ResponsePanel incident={inc} /></Panel>
          <Panel title="Action log">
            {myActs.length === 0 ? <p className="text-sm text-muted-foreground">No actions taken.</p> : (
              <ul className="space-y-1 font-mono text-xs">
                {myActs.map((a) => <li key={a.id}><span className="text-muted-foreground">{new Date(a.realTs).toLocaleTimeString()}</span> {a.kind} → <span className="text-primary">{a.target}</span></li>)}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
