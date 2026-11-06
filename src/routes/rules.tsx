import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Panel, PageHeader, SevBadge } from "@/components/soc/ui";
import { actions, useSim } from "@/lib/sim/store";
import type { Severity } from "@/lib/sim/engine";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Detection Rules Manager — SentinelLab" },
      { name: "description", content: "Configure detection thresholds, severity, time windows and correlation settings." },
      { property: "og:title", content: "Detection Rules — SentinelLab" },
      { property: "og:description", content: "Tune SOC detection rules mapped to MITRE ATT&CK." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const rules = useSim((s) => s.engine.rules);
  const alerts = useSim((s) => s.engine.alerts);
  const win = useSim((s) => s.engine.correlationWindowMin);

  return (
    <div>
      <PageHeader kicker="Module 03" title="Detection Rules Manager" desc="Changes apply instantly to newly ingested events. Each rule fires once per entity key per time window." />

      <Panel className="mb-4" title="Correlation engine">
        <div className="grid gap-4 font-mono text-xs md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">COMPOSITE ENTITY KEY</p>
            <p className="mt-1 text-primary">username ∪ source_ip ∪ asset_id</p>
          </div>
          <div>
            <p className="text-muted-foreground">SLIDING WINDOW Δt ≤</p>
            <div className="mt-1 flex items-center gap-2">
              <Input type="number" min={1} max={120} value={win} onChange={(e) => actions.setCorrelationWindow(Math.max(1, Number(e.target.value)))} className="h-8 w-20" />
              <span>minutes</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">STATE MACHINE</p>
            <p className="mt-1">NORMAL → <span className="text-sev-medium">SUSPICIOUS</span> (any alert) → <span className="text-sev-critical">INCIDENT_CRITICAL</span> (risk ≥ 70 or critical alert)</p>
          </div>
        </div>
      </Panel>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">On</th><th>Rule</th><th>MITRE</th><th>Severity</th><th>Threshold</th><th>Window (min)</th><th className="pr-3 text-right">Fired</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className={`border-b border-border/50 ${r.enabled ? "" : "opacity-50"}`}>
                <td className="p-3"><Switch checked={r.enabled} onCheckedChange={(v) => actions.updateRule(r.id, { enabled: v })} /></td>
                <td className="py-3 pr-4">
                  <p className="font-medium"><span className="mr-2 font-mono text-xs text-muted-foreground">{r.id}</span>{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </td>
                <td className="pr-4 font-mono text-xs text-accent">{r.mitre}<br /><span className="text-muted-foreground">{r.tactic}</span></td>
                <td className="pr-4">
                  <div className="flex items-center gap-2">
                    <SevBadge s={r.severity} />
                    <select value={r.severity} onChange={(e) => actions.updateRule(r.id, { severity: e.target.value as Severity })} className="rounded border border-input bg-background px-1 py-0.5 text-xs">
                      {["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
                <td className="pr-4"><Input type="number" min={1} value={r.threshold} onChange={(e) => actions.updateRule(r.id, { threshold: Math.max(1, Number(e.target.value)) })} className="h-8 w-20" /></td>
                <td className="pr-4"><Input type="number" min={1} value={r.windowMin} onChange={(e) => actions.updateRule(r.id, { windowMin: Math.max(1, Number(e.target.value)) })} className="h-8 w-20" /></td>
                <td className="pr-3 text-right font-mono">{alerts.filter((a) => a.ruleId === r.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
