import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PageHeader, fmtDur, fmtTime } from "@/components/soc/ui";
import { useSim } from "@/lib/sim/store";
import type { ActionKind, Incident } from "@/lib/sim/engine";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Incident Reporting — SentinelLab" },
      { name: "description", content: "Export structured incident reports with executive summary, timeline and remediation." },
      { property: "og:title", content: "Incident Reports — SentinelLab" },
      { property: "og:description", content: "Structured incident report export." },
    ],
  }),
  component: Reports,
});

const RECS: Record<string, string> = {
  "Credential Access": "Enforce MFA on VPN; enable rate-limiting and breached-password screening.",
  "Initial Access": "Review accounts with logins from anonymizing infrastructure; rotate affected credentials.",
  "Privilege Escalation": "Patch sudo (CVE-2021-3156) fleet-wide; audit privileged group changes.",
  Impact: "Restore /srv/finance from immutable backups; validate backup integrity.",
  Discovery: "Segment workstation VLANs from server subnets; alert on east-west scans.",
  Collection: "Apply least privilege on HR/Finance shares; enable file access auditing.",
  Exfiltration: "Block uploads to uncategorized hosts at the proxy; deploy DLP on egress.",
  "Command and Control": "Block C2 IP at the perimeter; hunt for the unsigned binary hash across endpoints.",
};
const ACT_LABEL: Record<ActionKind, string> = { ISOLATE_HOST: "Isolated host", TERMINATE_SESSIONS: "Terminated sessions", BLOCK_IP: "Blocked IP", FORCE_PASSWORD_RESET: "Forced password reset", REVOKE_ADMIN: "Revoked admin role" };

function Reports() {
  const engine = useSim((s) => s.engine);
  const [id, setId] = useState<string>("");
  const [summary, setSummary] = useState("");
  const inc = engine.incidents.find((i) => i.id === id) ?? engine.incidents[0];

  useEffect(() => {
    if (inc) setSummary(autoSummary(inc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc?.id]);

  if (!inc) return <div><PageHeader kicker="Module 06" title="Incident Reporting" /><p className="text-muted-foreground">No incidents to report yet.</p></div>;

  const events = engine.events.filter((e) => inc.eventIds.includes(e.id)).sort((a, b) => a.ts - b.ts);
  const blocked = engine.events.filter((e) => e.status === "BLOCKED_BY_POLICY" && [e.user, e.src_ip, e.asset, e.dst_ip].some((k) => k && [...inc.users, ...inc.ips, ...inc.assets].includes(k)));
  const acts = engine.actions.filter((a) => a.incidentId === inc.id).reverse();
  const recs = inc.tactics.map((t) => RECS[t]).filter(Boolean);

  const md = [
    `# Incident Report — ${inc.id}`,
    `**Title:** ${inc.title}  \n**State:** ${inc.state}  \n**Risk:** ${inc.risk}/100  \n**Verdict:** ${inc.verdict ?? "unassigned"}`,
    `## Executive Summary\n${summary}`,
    `## Scope\n- Users: ${inc.users.join(", ") || "-"}\n- IPs: ${inc.ips.join(", ") || "-"}\n- Assets: ${inc.assets.join(", ") || "-"}\n- MITRE ATT&CK: ${inc.techniques.join(", ")}`,
    `## Metrics\n- Time to detect: ${inc.ackRealTs ? fmtDur(inc.ackRealTs - inc.firstEventRealTs) : "n/a"}\n- Time to respond: ${inc.ackRealTs && inc.containedRealTs ? fmtDur(inc.containedRealTs - inc.ackRealTs) : "n/a"}\n- Events blocked by policy: ${blocked.length}`,
    `## Timeline (UTC, simulated)\n${events.map((e) => `- ${fmtTime(e.ts)} [${e.asset}] ${e.message}`).join("\n")}`,
    `## Response Actions\n${acts.map((a) => `- ${new Date(a.realTs).toLocaleTimeString()} ${ACT_LABEL[a.kind]}: ${a.target}`).join("\n") || "- none"}`,
    `## Analyst Notes\n${inc.notes.map((n) => `- ${n.text}`).join("\n") || "- none"}`,
    `## Remediation Recommendations\n${recs.map((r) => `- ${r}`).join("\n")}`,
  ].join("\n\n");

  const download = () => {
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inc.id}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="no-print">
        <PageHeader
          kicker="Module 06"
          title="Incident Reporting"
          right={
            <div className="flex gap-2">
              <select value={inc.id} onChange={(e) => setId(e.target.value)} className="rounded-md border border-input bg-background px-2 text-sm">
                {engine.incidents.map((i) => <option key={i.id} value={i.id}>{i.id} — {i.title.slice(0, 40)}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" /> Markdown</Button>
              <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / PDF</Button>
            </div>
          }
        />
        <Panel className="mb-4" title="Executive summary (editable)">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
        </Panel>
      </div>
      <Panel title="Report preview">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{md}</pre>
      </Panel>
    </div>
  );
}

function autoSummary(i: Incident) {
  return `${i.state === "INCIDENT_CRITICAL" ? "A critical" : "A suspicious"} incident was correlated across ${i.alertIds.length} alert(s) spanning ${i.tactics.join(", ")}. ` +
    `Affected entities include ${[...i.users, ...i.assets].join(", ")}. ` +
    (i.containedRealTs ? "Containment was applied and subsequent attacker activity was blocked by policy." : "Containment has not yet been applied.");
}
