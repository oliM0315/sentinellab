import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Flag, Lightbulb, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel, PageHeader, StateBadge, fmtDur } from "@/components/soc/ui";
import { actions, useSim } from "@/lib/sim/store";
import { SCENARIOS } from "@/lib/sim/scenarios";
import { FP_PENALTY, scoreRun } from "@/lib/sim/engine";
import { mttd, mttr } from "@/lib/sim/metrics";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Training & CTF Scenarios — SentinelLab" },
      { name: "description", content: "Guided multi-stage MITRE ATT&CK exercises scored on MTTD, MTTR and accuracy." },
      { property: "og:title", content: "Training & CTF — SentinelLab" },
      { property: "og:description", content: "Guided blue team exercises with objective scoring." },
    ],
  }),
  component: Training,
});

function Training() {
  const run = useSim((s) => s.run);
  const history = useSim((s) => s.history);
  const incidents = useSim((s) => s.engine.incidents);
  const [hints, setHints] = useState(0);
  const [rc, setRc] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const sc = run && SCENARIOS.find((s) => s.id === run.scenarioId);

  const runIncs = run ? incidents.filter((i) => i.scenarioId === run.scenarioId && i.malicious && i.createdRealTs >= run.startedRealTs) : [];
  const d = mttd(runIncs);
  const r = mttr(runIncs);
  const candidates = Array.from(new Set(incidents.filter((i) => run && i.createdRealTs >= run.startedRealTs).flatMap((i) => [...i.users.map((u) => `user:${u}`), ...i.ips.map((x) => `ip:${x}`), ...i.assets.map((a) => `asset:${a}`)])));
  const preview = sc && run ? scoreRun({ mttdSec: d, mttrSec: r, rootCauseCorrect: rc === sc.rootCause, scopeSelected: scope, scopeTruth: sc.scope, falsePositives: run.falsePositives }) : undefined;

  const start = (id: string) => {
    actions.reset();
    actions.inject(id, true);
    setHints(0); setRc(""); setScope([]);
  };

  return (
    <div>
      <PageHeader kicker="Module 05" title="Training & CTF Scenarios" desc="Starting an exercise resets the lab and launches the attack chain. Detect (acknowledge) fast, contain fast, then submit root cause and scope." />

      {!run && (
        <div className="grid gap-4 lg:grid-cols-2">
          {SCENARIOS.map((s) => (
            <Panel key={s.id} title={`${s.id} · ${s.difficulty}`}>
              <h3 className="text-lg font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.summary}</p>
              <ol className="mt-4 space-y-2">
                {s.chain.map((c, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <div><p className="font-medium">{c.stage} <span className="font-mono text-xs text-accent">{c.technique}</span></p><p className="text-xs text-muted-foreground">{c.detail}</p></div>
                  </li>
                ))}
              </ol>
              <Button className="mt-4" onClick={() => start(s.id)}><Play className="h-4 w-4" /> Start exercise</Button>
            </Panel>
          ))}
        </div>
      )}

      {run && sc && (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Panel title={`Active: ${sc.name}`} right={<span className="font-mono text-xs text-muted-foreground">elapsed {fmtDur((run.finishedRealTs ?? Date.now()) - run.startedRealTs)}</span>}>
              <p className="mb-3 text-sm text-muted-foreground">Incidents generated in this run — beware of decoys. Open one to acknowledge, set a verdict and contain.</p>
              <div className="space-y-2">
                {incidents.filter((i) => i.createdRealTs >= run.startedRealTs).map((i) => (
                  <Link key={i.id} to="/incidents/$id" params={{ id: i.id }} className="flex items-center gap-3 rounded border border-border p-2.5 hover:bg-muted">
                    <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                    <span className="flex-1 truncate text-sm">{i.title}</span>
                    <span className="font-mono text-xs">{i.verdict ?? "no verdict"}</span>
                    <StateBadge s={i.state} />
                  </Link>
                ))}
                {incidents.length === 0 && <p className="text-sm text-muted-foreground">Telemetry incoming…</p>}
              </div>
            </Panel>

            <Panel title="Submit findings">
              <p className="mb-2 text-sm font-medium">Root cause</p>
              <div className="space-y-1.5">
                {sc.rootCauseOptions.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="rc" checked={rc === o} onChange={() => setRc(o)} disabled={!!run.finishedRealTs} className="accent-[var(--primary)]" />{o}
                  </label>
                ))}
              </div>
              <p className="mb-2 mt-4 text-sm font-medium">Scope — affected entities</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {candidates.map((c) => (
                  <label key={c} className="flex items-center gap-2 font-mono text-xs">
                    <Checkbox checked={scope.includes(c)} disabled={!!run.finishedRealTs} onCheckedChange={(v) => setScope((s) => (v ? [...s, c] : s.filter((x) => x !== c)))} />{c}
                  </label>
                ))}
                {candidates.length === 0 && <p className="text-xs text-muted-foreground">Entities appear once incidents are correlated.</p>}
              </div>
              {!run.finishedRealTs ? (
                <Button className="mt-4" disabled={!rc} onClick={() => actions.submitRun(rc, scope, preview!.total)}><Flag className="h-4 w-4" /> Submit & score</Button>
              ) : (
                <div className="mt-4 flex gap-2"><Button variant="outline" onClick={actions.reset}>Back to scenarios</Button><Link to="/reports"><Button>Write report</Button></Link></div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Scorecard">
              <dl className="space-y-2 font-mono text-sm">
                <Row k="MTTD" v={d !== undefined ? fmtDur(d * 1000) : "—"} s={preview?.mttdScore} />
                <Row k="MTTR" v={r !== undefined ? fmtDur(r * 1000) : "—"} s={preview?.mttrScore} />
                {run.finishedRealTs && preview && (
                  <>
                    <Row k="Root cause" v={rc === sc.rootCause ? "correct" : "wrong"} />
                    <Row k="Scope match" v={`${Math.round(preview.scopeJaccard * 100)}%`} />
                    <Row k="Accuracy" v="" s={preview.accuracy} />
                  </>
                )}
                <Row k="False positives" v={`${run.falsePositives} × −${FP_PENALTY}`} />
              </dl>
              {run.fpLog.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-sev-medium">{run.fpLog.map((f, i) => <li key={i}>{f}</li>)}</ul>}
              {run.finishedRealTs && preview && (
                <div className="mt-4 rounded border border-primary/40 bg-primary/10 p-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Final score</p>
                  <p className="font-mono text-4xl font-bold text-primary">{preview.total}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">25% MTTD · 25% MTTR · 50% accuracy − penalties</p>
                </div>
              )}
            </Panel>
            <Panel title="Hints" right={<Button size="sm" variant="ghost" disabled={hints >= sc.hints.length} onClick={() => setHints((h) => h + 1)}><Lightbulb className="h-4 w-4" /> Reveal</Button>}>
              {hints === 0 ? <p className="text-sm text-muted-foreground">Try it unaided first.</p> : <ol className="list-decimal space-y-1 pl-4 text-sm">{sc.hints.slice(0, hints).map((h) => <li key={h}>{h}</li>)}</ol>}
            </Panel>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <Panel className="mt-4" title="Score history">
          <ul className="space-y-1 font-mono text-xs">
            {history.map((h, i) => <li key={i}>{new Date(h.startedRealTs).toLocaleTimeString()} · {h.scenarioId} · score <span className="text-primary">{h.total}</span> · FP {h.falsePositives}</li>)}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Row({ k, v, s }: { k: string; v: string; s?: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}{s !== undefined && <span className="ml-2 text-primary">{s}/100</span>}</dd>
    </div>
  );
}
