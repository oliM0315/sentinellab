import { Ban, KeyRound, LogOut, MonitorX, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actions, useSim } from "@/lib/sim/store";
import type { ActionKind, Incident } from "@/lib/sim/engine";

const DEFS: { kind: ActionKind; label: string; group: "Containment" | "Remediation"; icon: typeof Ban; field: "assets" | "ips" | "users" }[] = [
  { kind: "ISOLATE_HOST", label: "Isolate host", group: "Containment", icon: MonitorX, field: "assets" },
  { kind: "TERMINATE_SESSIONS", label: "Terminate active sessions", group: "Containment", icon: LogOut, field: "users" },
  { kind: "BLOCK_IP", label: "Temporary IP block", group: "Containment", icon: Ban, field: "ips" },
  { kind: "FORCE_PASSWORD_RESET", label: "Force password reset", group: "Remediation", icon: KeyRound, field: "users" },
  { kind: "REVOKE_ADMIN", label: "Revoke admin role", group: "Remediation", icon: ShieldOff, field: "users" },
];

export function ResponsePanel({ incident }: { incident: Incident }) {
  const done = useSim((s) => s.engine.actions);
  const has = (k: ActionKind, t: string) => done.some((a) => a.kind === k && a.target === t);
  return (
    <div className="space-y-4">
      {(["Containment", "Remediation"] as const).map((g) => (
        <div key={g}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{g}</p>
          <div className="space-y-2">
            {DEFS.filter((d) => d.group === g).map((d) => (
              <div key={d.kind} className="rounded border border-border p-2">
                <p className="mb-1.5 flex items-center gap-2 text-xs font-medium"><d.icon className="h-3.5 w-3.5 text-primary" />{d.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {incident[d.field].length === 0 && <span className="text-xs text-muted-foreground">no targets</span>}
                  {incident[d.field].map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={has(d.kind, t) ? "secondary" : g === "Containment" ? "destructive" : "outline"}
                      disabled={has(d.kind, t)}
                      className="h-7 font-mono text-[11px]"
                      onClick={() => {
                        actions.respond(d.kind, t, incident.id);
                        toast.success(`${d.kind} → ${t}`, { description: "Policy enforced. Matching events will be BLOCKED_BY_POLICY." });
                      }}
                    >
                      {has(d.kind, t) ? "✓ " : ""}{t}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
