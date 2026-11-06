import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader, fmtTime } from "@/components/soc/ui";
import { useSim } from "@/lib/sim/store";
import { normalizeLine } from "@/lib/sim/normalize";
import type { SimEvent } from "@/lib/sim/engine";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Log Analysis & Normalization — SentinelLab" },
      { name: "description", content: "Search, filter and normalize raw security logs into a common event schema." },
      { property: "og:title", content: "Log Analysis — SentinelLab" },
      { property: "og:description", content: "Search, filter and normalize raw security logs." },
    ],
  }),
  component: LogsPage,
});

const SAMPLE = `2026-11-06T09:14:02Z VPN-GW-01 sshd[2211]: Failed password for jdoe from 185.220.101.47 port 40001 ssh2
2026-11-06T09:14:40Z fw01 CONN src=10.0.5.21 dst=10.0.5.30 dport=445 proto=tcp action=allow bytes=0 host=LAB-PC-01
2026-11-06T09:20:11Z proxy01 10.0.5.21 ktadesse POST https://45.77.12.9/upload bytes_out=480000000
10.0.2.15 - hgirma [06/Nov/2026:09:01:00 +0000] "GET /portal HTTP/1.1" 200 5120
{"@timestamp":"2026-11-06T09:22:00Z","host":"LAB-PC-01","source":"endpoint","event":"process_start","user":"ktadesse","path":"update.exe"}`;

function LogsPage() {
  const events = useSim((s) => s.engine.events);
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<SimEvent | null>(null);
  const [raw, setRaw] = useState(SAMPLE);
  const [parsed, setParsed] = useState<ReturnType<typeof normalizeLine>[]>([]);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return events
      .filter((e) => (src === "all" || e.source === src) && (status === "all" || (status === "alerted" ? e.alertIds.length > 0 : e.status === status)))
      .filter((e) => !t || [e.raw, e.user, e.src_ip, e.asset, e.type, e.id].some((v) => v?.toLowerCase().includes(t)))
      .slice(-300)
      .reverse();
  }, [events, q, src, status]);

  return (
    <div>
      <PageHeader kicker="Module 02" title="Log Analysis & Normalization" desc="Query every ingested event, inspect the raw line next to its normalized form, or paste your own logs to test the parsers." />
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Search user, IP, asset, event id, raw text…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md font-mono text-sm" />
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="rounded-md border border-input bg-background px-2 text-sm">
          {["all", "auth", "endpoint", "network", "file", "proxy", "iam"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">all statuses</option>
          <option value="OK">OK</option>
          <option value="BLOCKED_BY_POLICY">BLOCKED_BY_POLICY</option>
          <option value="alerted">alerted only</option>
        </select>
        <span className="self-center font-mono text-xs text-muted-foreground">{filtered.length} results</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title="Event store">
          <div className="h-[460px] overflow-auto font-mono text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">time</th><th className="pr-2">id</th><th className="pr-2">type</th><th className="pr-2">user</th><th className="pr-2">src_ip</th><th className="pr-2">asset</th><th>status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} onClick={() => setSel(e)} className={`cursor-pointer border-t border-border/50 hover:bg-muted ${sel?.id === e.id ? "bg-muted" : ""} ${e.malicious ? "" : ""}`}>
                    <td className="py-1 pr-2 text-muted-foreground">{fmtTime(e.ts)}</td>
                    <td className="pr-2">{e.id}</td>
                    <td className="pr-2 text-sev-low">{e.type}</td>
                    <td className="pr-2">{e.user}</td>
                    <td className="pr-2">{e.src_ip}</td>
                    <td className="pr-2 text-primary">{e.asset}</td>
                    <td className={e.status === "OK" ? (e.alertIds.length ? "text-sev-critical" : "text-muted-foreground") : "text-sev-medium"}>{e.alertIds.length ? "ALERT" : e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="xl:col-span-2" title="Raw → normalized">
          {!sel ? (
            <p className="text-sm text-muted-foreground">Select an event to inspect.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              <p className="text-muted-foreground">RAW</p>
              <pre className="whitespace-pre-wrap break-all rounded bg-background p-2">{sel.raw}</pre>
              <p className="text-muted-foreground">NORMALIZED</p>
              <pre className="whitespace-pre-wrap rounded bg-background p-2 text-primary">
                {JSON.stringify({ id: sel.id, timestamp: new Date(sel.ts).toISOString(), source: sel.source, event_type: sel.type, username: sel.user, source_ip: sel.src_ip, dest_ip: sel.dst_ip, dest_port: sel.port, asset_id: sel.asset, path: sel.path, bytes: sel.bytes, status: sel.status, blocked_by: sel.blockedBy, alerts: sel.alertIds }, null, 2)}
              </pre>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title="Normalization playground" right={<Button size="sm" onClick={() => setParsed(raw.split("\n").filter(Boolean).map(normalizeLine))}>Normalize</Button>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={10} className="font-mono text-xs" />
          <pre className="h-60 overflow-auto rounded bg-background p-2 font-mono text-xs text-primary">{parsed.length ? JSON.stringify(parsed, null, 2) : "Supports sshd, firewall CONN, proxy, Apache CLF and JSON lines."}</pre>
        </div>
      </Panel>
    </div>
  );
}
