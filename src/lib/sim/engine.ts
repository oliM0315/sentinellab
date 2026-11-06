// SentinelLab simulation engine: pure functions (no React) so it can be unit tested.

export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentState = "NORMAL" | "SUSPICIOUS" | "INCIDENT_CRITICAL";
export type EventSource = "auth" | "endpoint" | "network" | "file" | "proxy" | "iam";

export interface SimEvent {
  id: string;
  ts: number; // simulated wall clock (ms)
  realTs: number; // real ms when emitted
  source: EventSource;
  type: string;
  user?: string;
  src_ip?: string;
  dst_ip?: string;
  asset?: string;
  port?: number;
  path?: string;
  bytes?: number;
  message: string;
  raw: string;
  status: "OK" | "BLOCKED_BY_POLICY";
  blockedBy?: string;
  malicious: boolean;
  scenarioId?: string;
  alertIds: string[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: Severity;
  threshold: number;
  windowMin: number;
  mitre: string;
  tactic: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  ts: number;
  realTs: number;
  severity: Severity;
  mitre: string;
  tactic: string;
  eventIds: string[];
  incidentId: string;
  summary: string;
}

export interface ResponseAction {
  id: string;
  kind: ActionKind;
  target: string;
  realTs: number;
  ts: number;
  incidentId?: string;
}

export type ActionKind =
  | "ISOLATE_HOST"
  | "TERMINATE_SESSIONS"
  | "BLOCK_IP"
  | "FORCE_PASSWORD_RESET"
  | "REVOKE_ADMIN";

export interface Incident {
  id: string;
  title: string;
  state: IncidentState;
  status: "open" | "investigating" | "contained" | "closed";
  verdict?: "TP" | "FP";
  users: string[];
  ips: string[];
  assets: string[];
  alertIds: string[];
  eventIds: string[];
  tactics: string[];
  techniques: string[];
  risk: number;
  firstEventRealTs: number;
  lastTs: number;
  createdRealTs: number;
  ackRealTs?: number;
  containedRealTs?: number;
  notes: { realTs: number; text: string }[];
  scenarioId?: string;
  malicious: boolean;
}

export interface Blocks {
  hosts: string[];
  ips: string[];
  users: string[]; // sessions terminated / password reset
  adminRevoked: string[];
}

export interface EngineState {
  simClock: number;
  events: SimEvent[];
  alerts: Alert[];
  incidents: Incident[];
  rules: Rule[];
  blocks: Blocks;
  actions: ResponseAction[];
  correlationWindowMin: number;
  ruleCooldown: Record<string, number>; // ruleId|key -> last fired sim ts
  seq: number;
}

export const SEVERITY_WEIGHT: Record<Severity, number> = { low: 10, medium: 20, high: 35, critical: 50 };

export const DEFAULT_RULES: Rule[] = [
  { id: "R1", name: "Credential Stuffing / Password Spray", description: "N+ failed logins from one source IP inside the window.", enabled: true, severity: "high", threshold: 5, windowMin: 5, mitre: "T1110.004", tactic: "Credential Access" },
  { id: "R2", name: "Login Success After Failures", description: "Successful login from an IP that produced failures inside the window.", enabled: true, severity: "high", threshold: 3, windowMin: 10, mitre: "T1078", tactic: "Initial Access" },
  { id: "R3", name: "Privilege Escalation", description: "Local exploit / sudo abuse / unexpected admin role grant.", enabled: true, severity: "critical", threshold: 1, windowMin: 10, mitre: "T1068", tactic: "Privilege Escalation" },
  { id: "R4", name: "Destructive Impact", description: "Mass deletion or encryption of files by one user.", enabled: true, severity: "critical", threshold: 1, windowMin: 10, mitre: "T1485", tactic: "Impact" },
  { id: "R5", name: "Internal Port Scan", description: "N+ distinct destination ports from one asset inside the window.", enabled: true, severity: "medium", threshold: 8, windowMin: 2, mitre: "T1046", tactic: "Discovery" },
  { id: "R6", name: "Sensitive File Access", description: "Access to files under HR / Finance / Secrets shares.", enabled: true, severity: "high", threshold: 2, windowMin: 10, mitre: "T1005", tactic: "Collection" },
  { id: "R7", name: "Data Staging & Exfiltration", description: "Archive staging or outbound upload above 50 MB.", enabled: true, severity: "critical", threshold: 1, windowMin: 10, mitre: "T1048", tactic: "Exfiltration" },
  { id: "R8", name: "C2 Beaconing", description: "Periodic outbound connections from an unsigned process.", enabled: true, severity: "high", threshold: 1, windowMin: 10, mitre: "T1071.001", tactic: "Command and Control" },
];

export const SIM_START = Date.UTC(2026, 10, 6, 9, 0, 0);

export function createInitialState(): EngineState {
  return {
    simClock: SIM_START,
    events: [],
    alerts: [],
    incidents: [],
    rules: DEFAULT_RULES.map((r) => ({ ...r })),
    blocks: { hosts: [], ips: [], users: [], adminRevoked: [] },
    actions: [],
    correlationWindowMin: 10,
    ruleCooldown: {},
    seq: 0,
  };
}

/** Which containment/remediation policy (if any) blocks this event. */
export function blockingPolicy(b: Blocks, e: Pick<SimEvent, "asset" | "src_ip" | "dst_ip" | "user" | "type">): string | undefined {
  if (e.asset && b.hosts.includes(e.asset)) return `Host ${e.asset} isolated`;
  if (e.src_ip && b.ips.includes(e.src_ip)) return `IP ${e.src_ip} blocked`;
  if (e.dst_ip && b.ips.includes(e.dst_ip)) return `IP ${e.dst_ip} blocked`;
  if (e.user && b.adminRevoked.includes(e.user) && (e.type === "priv_escalation" || e.type === "role_grant" || e.type === "mass_delete")) return `Admin role revoked for ${e.user}`;
  return undefined;
}

function isSessionBound(e: Partial<SimEvent>) {
  return !!e.user && e.type !== "login_failed";
}

export function checkBlocked(b: Blocks, e: Partial<SimEvent>): string | undefined {
  const base = blockingPolicy(b, { ...e, type: e.type ?? "" } as SimEvent);
  if (base) return base;
  if (e.user && b.users.includes(e.user) && isSessionBound(e)) return `Sessions/credentials of ${e.user} revoked`;
  return undefined;
}

type Draft = Omit<SimEvent, "id" | "ts" | "realTs" | "status" | "alertIds" | "raw"> & { raw?: string; delaySec?: number };

export function formatRaw(e: Omit<SimEvent, "raw" | "id" | "alertIds" | "status" | "realTs">): string {
  const t = new Date(e.ts).toISOString();
  const host = e.asset ?? "-";
  switch (e.source) {
    case "auth":
      return `${t} ${host} sshd[2211]: ${e.type === "login_failed" ? "Failed password" : "Accepted password"} for ${e.user} from ${e.src_ip} port ${e.port ?? 22} ssh2`;
    case "network":
      return `${t} fw01 CONN src=${e.src_ip} dst=${e.dst_ip} dport=${e.port} proto=tcp action=allow bytes=${e.bytes ?? 0} host=${host}`;
    case "proxy":
      return `${t} proxy01 ${e.src_ip} ${e.user ?? "-"} POST https://${e.dst_ip}/upload bytes_out=${e.bytes ?? 0}`;
    default:
      return JSON.stringify({ "@timestamp": t, host, source: e.source, event: e.type, user: e.user, path: e.path, msg: e.message });
  }
}

const WIN = (min: number) => min * 60_000;

/** Shared infrastructure every user touches; never used as a correlation pivot. */
export const NON_PIVOT_ASSETS = ["VPN-GW-01"];

function entityKeys(e: Partial<SimEvent>): string[] {
  const k: string[] = [];
  if (e.user) k.push(`user:${e.user}`);
  if (e.src_ip) k.push(`ip:${e.src_ip}`);
  if (e.asset && !NON_PIVOT_ASSETS.includes(e.asset)) k.push(`asset:${e.asset}`);
  return k;
}

function incidentKeys(i: Incident): string[] {
  return [...i.users.map((u) => `user:${u}`), ...i.ips.map((x) => `ip:${x}`), ...i.assets.filter((a) => !NON_PIVOT_ASSETS.includes(a)).map((a) => `asset:${a}`)];
}

interface Hit {
  rule: Rule;
  eventIds: string[];
  key: string;
  summary: string;
}

function evaluateRules(state: EngineState, e: SimEvent): Hit[] {
  const hits: Hit[] = [];
  const active = state.events.filter((x) => x.status === "OK");
  for (const r of state.rules) {
    if (!r.enabled) continue;
    const since = e.ts - WIN(r.windowMin);
    const recent = active.filter((x) => x.ts >= since);
    switch (r.id) {
      case "R1":
        if (e.type === "login_failed" && e.src_ip) {
          const m = recent.filter((x) => x.type === "login_failed" && x.src_ip === e.src_ip);
          if (m.length >= r.threshold) hits.push({ rule: r, key: `ip:${e.src_ip}`, eventIds: m.map((x) => x.id), summary: `${m.length} failed logins from ${e.src_ip} across ${new Set(m.map((x) => x.user)).size} accounts` });
        }
        break;
      case "R2":
        if (e.type === "login_success" && e.src_ip) {
          const f = recent.filter((x) => x.type === "login_failed" && x.src_ip === e.src_ip);
          if (f.length >= r.threshold) hits.push({ rule: r, key: `ip:${e.src_ip}|${e.user}`, eventIds: [...f.map((x) => x.id), e.id], summary: `${e.user} logged in from ${e.src_ip} after ${f.length} failures` });
        }
        break;
      case "R3":
        if (e.type === "priv_escalation" || e.type === "role_grant") hits.push({ rule: r, key: `user:${e.user}|${e.type}`, eventIds: [e.id], summary: e.message });
        break;
      case "R4":
        if (e.type === "mass_delete") hits.push({ rule: r, key: `user:${e.user}`, eventIds: [e.id], summary: e.message });
        break;
      case "R5":
        if (e.type === "conn_attempt" && e.asset) {
          const m = recent.filter((x) => x.type === "conn_attempt" && x.asset === e.asset);
          const ports = new Set(m.map((x) => x.port));
          if (ports.size >= r.threshold) hits.push({ rule: r, key: `asset:${e.asset}`, eventIds: m.map((x) => x.id), summary: `${e.asset} probed ${ports.size} ports on ${e.dst_ip}` });
        }
        break;
      case "R6":
        if (e.type === "file_access" && e.path && /(HR|Finance|Secrets|salar|passw)/i.test(e.path)) {
          const m = recent.filter((x) => x.type === "file_access" && x.user === e.user && x.path && /(HR|Finance|Secrets|salar|passw)/i.test(x.path));
          if (m.length >= r.threshold) hits.push({ rule: r, key: `user:${e.user}`, eventIds: m.map((x) => x.id), summary: `${e.user} accessed ${m.length} sensitive files` });
        }
        break;
      case "R7":
        if (e.type === "archive_create" || (e.type === "upload" && (e.bytes ?? 0) > 50_000_000)) hits.push({ rule: r, key: `asset:${e.asset}|${e.type}`, eventIds: [e.id], summary: e.message });
        break;
      case "R8":
        if (e.type === "beacon") hits.push({ rule: r, key: `asset:${e.asset}`, eventIds: [e.id], summary: e.message });
        break;
    }
  }
  // cooldown: one alert per rule+key per window
  return hits.filter((h) => {
    const ck = `${h.rule.id}|${h.key}`;
    const last = state.ruleCooldown[ck];
    if (last !== undefined && e.ts - last < WIN(h.rule.windowMin)) return false;
    state.ruleCooldown[ck] = e.ts;
    return true;
  });
}

export function computeRisk(alerts: Alert[]): { risk: number; state: IncidentState } {
  if (alerts.length === 0) return { risk: 0, state: "NORMAL" };
  const base = alerts.reduce((s, a) => s + SEVERITY_WEIGHT[a.severity], 0);
  const tactics = new Set(alerts.map((a) => a.tactic)).size;
  const risk = Math.min(100, base + (tactics - 1) * 10);
  const critical = risk >= 70 || alerts.some((a) => a.severity === "critical");
  return { risk, state: critical ? "INCIDENT_CRITICAL" : "SUSPICIOUS" };
}

/** Correlate: find an open incident sharing a composite entity key whose last activity is within Δt. */
export function findCorrelatedIncident(state: EngineState, keys: string[], ts: number): Incident | undefined {
  return state.incidents.find(
    (i) => i.status !== "closed" && ts - i.lastTs <= WIN(state.correlationWindowMin) && incidentKeys(i).some((k) => keys.includes(k)),
  );
}

const uniq = <T,>(a: T[]) => Array.from(new Set(a.filter((x) => x !== undefined && x !== null && x !== "")));

/** Ingest one draft event; mutates and returns state (caller clones). */
export function ingest(state: EngineState, d: Draft, realNow: number): SimEvent {
  state.simClock += (d.delaySec ?? 20) * 1000;
  state.seq += 1;
  const base = { ...d, ts: state.simClock } as Omit<SimEvent, "id" | "raw" | "alertIds" | "status" | "realTs">;
  delete (base as { delaySec?: number }).delaySec;
  const blockedBy = checkBlocked(state.blocks, base);
  const ev: SimEvent = {
    ...base,
    id: `EV-${String(state.seq).padStart(5, "0")}`,
    realTs: realNow,
    raw: d.raw ?? formatRaw(base),
    status: blockedBy ? "BLOCKED_BY_POLICY" : "OK",
    blockedBy,
    alertIds: [],
  };
  state.events.push(ev);
  if (blockedBy) return ev;

  const hits = evaluateRules(state, ev);
  // also correlate raw events into existing incidents (enrichment) even w/o alert
  const keys = entityKeys(ev);
  let inc = findCorrelatedIncident(state, keys, ev.ts);
  if (inc && hits.length === 0) {
    if (!inc.eventIds.includes(ev.id)) {
      inc.eventIds.push(ev.id);
      inc.lastTs = ev.ts;
      mergeEntities(inc, ev);
    }
  }
  for (const h of hits) {
    if (!inc) {
      inc = {
        id: `INC-${String(state.incidents.length + 1).padStart(3, "0")}`,
        title: h.rule.name,
        state: "SUSPICIOUS",
        status: "open",
        users: [],
        ips: [],
        assets: [],
        alertIds: [],
        eventIds: [],
        tactics: [],
        techniques: [],
        risk: 0,
        firstEventRealTs: realNow,
        lastTs: ev.ts,
        createdRealTs: realNow,
        notes: [],
        scenarioId: ev.scenarioId,
        malicious: false,
      };
      state.incidents.unshift(inc);
    }
    const alert: Alert = {
      id: `AL-${String(state.alerts.length + 1).padStart(4, "0")}`,
      ruleId: h.rule.id,
      ruleName: h.rule.name,
      ts: ev.ts,
      realTs: realNow,
      severity: h.rule.severity,
      mitre: h.rule.mitre,
      tactic: h.rule.tactic,
      eventIds: h.eventIds,
      incidentId: inc.id,
      summary: h.summary,
    };
    state.alerts.unshift(alert);
    ev.alertIds.push(alert.id);
    inc.alertIds.push(alert.id);
    for (const id of h.eventIds) {
      if (!inc.eventIds.includes(id)) inc.eventIds.push(id);
      const src = state.events.find((x) => x.id === id);
      if (src) {
        mergeEntities(inc, src);
        if (src.malicious) inc.malicious = true;
        if (src.realTs < inc.firstEventRealTs) inc.firstEventRealTs = src.realTs;
        if (!inc.scenarioId && src.scenarioId) inc.scenarioId = src.scenarioId;
      }
    }
    inc.tactics = uniq([...inc.tactics, h.rule.tactic]);
    inc.techniques = uniq([...inc.techniques, h.rule.mitre]);
    inc.lastTs = ev.ts;
    const { risk, state: st } = computeRisk(state.alerts.filter((a) => a.incidentId === inc!.id));
    inc.risk = risk;
    inc.state = st;
    if (st === "INCIDENT_CRITICAL" && inc.alertIds.length > 1) inc.title = `Multi-stage attack: ${inc.tactics.join(" → ")}`;
  }
  return ev;
}

function mergeEntities(inc: Incident, e: SimEvent) {
  inc.users = uniq([...inc.users, e.user!]);
  inc.ips = uniq([...inc.ips, e.src_ip!]);
  inc.assets = uniq([...inc.assets, e.asset!]);
}

export function applyAction(state: EngineState, kind: ActionKind, target: string, realNow: number, incidentId?: string): ResponseAction {
  const b = state.blocks;
  const add = (arr: string[]) => (arr.includes(target) ? arr : [...arr, target]);
  if (kind === "ISOLATE_HOST") b.hosts = add(b.hosts);
  if (kind === "BLOCK_IP") b.ips = add(b.ips);
  if (kind === "TERMINATE_SESSIONS" || kind === "FORCE_PASSWORD_RESET") b.users = add(b.users);
  if (kind === "REVOKE_ADMIN") b.adminRevoked = add(b.adminRevoked);
  const a: ResponseAction = { id: `ACT-${state.actions.length + 1}`, kind, target, realTs: realNow, ts: state.simClock, incidentId };
  state.actions.unshift(a);
  if (incidentId) {
    const inc = state.incidents.find((i) => i.id === incidentId);
    if (inc && ["ISOLATE_HOST", "BLOCK_IP", "TERMINATE_SESSIONS"].includes(kind)) {
      if (!inc.containedRealTs) inc.containedRealTs = realNow;
      if (inc.status !== "closed") inc.status = "contained";
    }
  }
  return a;
}

// ---------------- Scoring ----------------
export interface ScoreInput {
  mttdSec?: number;
  mttrSec?: number;
  rootCauseCorrect: boolean;
  scopeSelected: string[];
  scopeTruth: string[];
  falsePositives: number;
}

export interface ScoreResult {
  mttdScore: number;
  mttrScore: number;
  accuracy: number;
  scopeJaccard: number;
  penalty: number;
  total: number;
}

/** Linear decay: full points at or below `best`, zero at or beyond `worst`. */
export function timeScore(sec: number | undefined, best: number, worst: number): number {
  if (sec === undefined) return 0;
  if (sec <= best) return 100;
  if (sec >= worst) return 0;
  return Math.round(100 * (1 - (sec - best) / (worst - best)));
}

export const FP_PENALTY = 15;

export function scoreRun(i: ScoreInput): ScoreResult {
  const mttdScore = timeScore(i.mttdSec, 30, 300);
  const mttrScore = timeScore(i.mttrSec, 60, 600);
  const sel = new Set(i.scopeSelected);
  const truth = new Set(i.scopeTruth);
  const inter = [...sel].filter((x) => truth.has(x)).length;
  const union = new Set([...sel, ...truth]).size;
  const scopeJaccard = union === 0 ? 0 : inter / union;
  const accuracy = Math.round((i.rootCauseCorrect ? 50 : 0) + scopeJaccard * 50);
  const penalty = i.falsePositives * FP_PENALTY;
  const total = Math.max(0, Math.round(0.25 * mttdScore + 0.25 * mttrScore + 0.5 * accuracy - penalty));
  return { mttdScore, mttrScore, accuracy, scopeJaccard, penalty, total };
}
