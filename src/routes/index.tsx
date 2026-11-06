import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Crosshair, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, SevBadge, StateBadge, fmtTime } from "@/components/soc/ui";
import { actions, setSpeed, useSim } from "@/lib/sim/store";
import { SCENARIOS } from "@/lib/sim/scenarios";
import type { Severity } from "@/lib/sim/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOC Dashboard — SentinelLab" },
      { name: "description", content: "Live security event feed, severity breakdown, active incidents and attack injector." },
      { property: "og:title", content: "SOC Dashboard — SentinelLab" },
      { property: "og:description", content: "Live SOC dashboard for blue team incident response training." },
    ],
  }),
  component: Dashboard,
});

const SEVS: Severity[] = ["low", "medium", "high", "critical"];

function Dashboard() {
  const engine = useSim((s) => s.engine);
  const running = useSim((s) => s.running);
  const noise = useSim((s) => s.noise);
  const queue = useSim((s) => s.queue.length);
  const speed = useSim((s) => s.speedMs);
  const events = engine.events.slice(-40).reverse();
  const blocked = engine.events.filter((e) => e.status === "BLOCKED_BY_POLICY").length;
  const open = engine.incidents.filter((i) => i.status !== "closed");
  const sevData = SEVS.map((s) => ({ s, n: engine.alerts.filter((a) => a.severity === s).length }));

  return (
    <div>
      <PageHeader
        kicker="Security Operations Center"
        title="Live Monitoring"
        desc="Events stream from simulated auth, endpoint, network, file and proxy sensors. Rules raise alerts; the correlation engine merges them into incidents."
        right={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={actions.toggleRunning}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" size="sm" onClick={actions.reset}>
              <RotateCcw className="h-4 w-4" /> Reset lab
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Events", engine.events.length],
          ["Alerts", engine.alerts.length],
          ["Open incidents", open.length],
          ["Critical", open.filter((i) => i.state === "INCIDENT_CRITICAL").length],
          ["Blocked by policy", blocked],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-card px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
            <p className="mt-1 font-mono text-3xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Live event feed"
          right={<span className="font-mono text-[10px] text-muted-foreground">{running ? "● streaming" : "paused"} · queue {queue}</span>}
        >
          <div className="h-[420px] overflow-auto font-mono text-xs">
            {events.length === 0 && <p className="text-muted-foreground">Waiting for telemetry…</p>}
            {events.map((e) => (
              <div key={e.id} className={`flex gap-3 border-b border-border/50 py-1.5 ${e.status === "BLOCKED_BY_POLICY" ? "opacity-60" : ""}`}>
                <span className="text-muted-foreground">{fmtTime(e.ts)}</span>
                <span className="w-16 shrink-0 uppercase text-sev-low">{e.source}</span>
                <span className="w-28 shrink-0 truncate text-primary">{e.asset}</span>
                <span className="min-w-0 flex-1 truncate">{e.message}</span>
                {e.status === "BLOCKED_BY_POLICY" && <span className="shrink-0 text-sev-medium">BLOCKED_BY_POLICY</span>}
                {e.alertIds.length > 0 && <span className="shrink-0 text-sev-critical">▲ {e.alertIds.join(",")}</span>}
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Attack simulator injector">
            <div className="space-y-3">
              {SCENARIOS.map((s) => (
                <div key={s.id} className="rounded border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{s.name}</p>
                    <span className="font-mono text-[10px] text-muted-foreground">{s.id}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{s.chain.map((c) => c.technique.split(" ")[0]).join(" → ")}</p>
                  <Button size="sm" className="mt-2 w-full" onClick={() => actions.inject(s.id)}>
                    <Zap className="h-4 w-4" /> Inject
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <button onClick={actions.toggleNoise} className="hover:text-foreground">Background noise: {noise ? "ON" : "OFF"}</button>
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded border border-border bg-background px-1 py-0.5">
                  <option value={2500}>slow</option>
                  <option value={1500}>normal</option>
                  <option value={600}>fast</option>
                </select>
              </div>
            </div>
          </Panel>

          <Panel title="Alert severity">
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={sevData}>
                  <XAxis dataKey="s" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} width={24} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="n" radius={[3, 3, 0, 0]}>
                    {sevData.map((d) => (
                      <Cell key={d.s} fill={`var(--sev-${d.s})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Active incidents" right={<Link to="/incidents" className="font-mono text-[11px] text-primary">view all →</Link>}>
          {open.length === 0 && <p className="text-sm text-muted-foreground">No active incidents. Inject a scenario to begin.</p>}
          <div className="space-y-2">
            {open.slice(0, 6).map((i) => (
              <Link key={i.id} to="/incidents/$id" params={{ id: i.id }} className="flex items-center gap-3 rounded border border-border p-2.5 hover:bg-muted">
                <Crosshair className="h-4 w-4 text-sev-critical" />
                <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
                <span className="font-mono text-xs">risk {i.risk}</span>
                <StateBadge s={i.state} />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Recent alerts">
          <div className="max-h-72 space-y-1.5 overflow-auto">
            {engine.alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
            {engine.alerts.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <SevBadge s={a.severity} />
                <span className="font-mono text-[11px] text-accent">{a.mitre}</span>
                <span className="min-w-0 flex-1 truncate">{a.summary}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{a.incidentId}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
