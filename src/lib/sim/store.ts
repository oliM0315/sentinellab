import { useSyncExternalStore } from "react";
import { applyAction, createInitialState, ingest, type ActionKind, type EngineState, type Rule } from "./engine";
import { SCENARIOS, noiseEvent, type Draft } from "./scenarios";

export interface TrainingRun {
  scenarioId: string;
  startedRealTs: number;
  finishedRealTs?: number;
  rootCause?: string;
  scope?: string[];
  falsePositives: number;
  fpLog: string[];
}

export interface AppState {
  engine: EngineState;
  queue: Draft[];
  running: boolean;
  noise: boolean;
  speedMs: number;
  run?: TrainingRun;
  history: (TrainingRun & { total: number })[];
  version: number;
}

let state: AppState = {
  engine: createInitialState(),
  queue: [],
  running: true,
  noise: true,
  speedMs: 1500,
  history: [],
  version: 0,
};
const listeners = new Set<() => void>();
const serverSnapshot = state;

function commit() {
  state = { ...state, engine: { ...state.engine }, version: state.version + 1 };
  listeners.forEach((l) => l());
}

export function useSim<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(serverSnapshot),
  );
}
export const getSim = () => state;

let timer: ReturnType<typeof setInterval> | undefined;
let tickCount = 0;
function tick() {
  if (!state.running) return;
  tickCount++;
  const next = state.queue.shift();
  if (next) ingest(state.engine, next, Date.now());
  else if (state.noise && tickCount % 2 === 0) ingest(state.engine, noiseEvent(), Date.now());
  else return;
  if (state.engine.events.length > 1500) state.engine.events = state.engine.events.slice(-1200);
  commit();
}
export function startTicker() {
  if (timer) return;
  timer = setInterval(tick, state.speedMs);
}
export function setSpeed(ms: number) {
  state.speedMs = ms;
  if (timer) clearInterval(timer);
  timer = undefined;
  startTicker();
  commit();
}

export const actions = {
  toggleRunning() {
    state.running = !state.running;
    commit();
  },
  toggleNoise() {
    state.noise = !state.noise;
    commit();
  },
  inject(scenarioId: string, training = false) {
    const sc = SCENARIOS.find((s) => s.id === scenarioId);
    if (!sc) return;
    state.queue.push(...sc.build());
    if (training) state.run = { scenarioId, startedRealTs: Date.now(), falsePositives: 0, fpLog: [] };
    commit();
  },
  reset() {
    const history = state.history;
    state = { ...state, engine: createInitialState(), queue: [], run: undefined, history, version: state.version + 1 };
    listeners.forEach((l) => l());
  },
  updateRule(id: string, patch: Partial<Rule>) {
    state.engine.rules = state.engine.rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    commit();
  },
  setCorrelationWindow(min: number) {
    state.engine.correlationWindowMin = min;
    commit();
  },
  acknowledge(incidentId: string) {
    const inc = state.engine.incidents.find((i) => i.id === incidentId);
    if (!inc) return;
    if (!inc.ackRealTs) inc.ackRealTs = Date.now();
    if (inc.status === "open") inc.status = "investigating";
    commit();
  },
  respond(kind: ActionKind, target: string, incidentId?: string) {
    applyAction(state.engine, kind, target, Date.now(), incidentId);
    const inc = state.engine.incidents.find((i) => i.id === incidentId);
    if (inc && !inc.ackRealTs) inc.ackRealTs = Date.now();
    // false positive penalty: response on an entity outside the active scenario's true scope
    const run = state.run;
    if (run && !run.finishedRealTs) {
      const sc = SCENARIOS.find((s) => s.id === run.scenarioId)!;
      const prefix = kind === "ISOLATE_HOST" ? "asset" : kind === "BLOCK_IP" ? "ip" : "user";
      if (!sc.scope.includes(`${prefix}:${target}`)) {
        run.falsePositives += 1;
        run.fpLog.push(`${kind} on out-of-scope entity ${target}`);
      }
    }
    commit();
  },
  setVerdict(incidentId: string, verdict: "TP" | "FP") {
    const inc = state.engine.incidents.find((i) => i.id === incidentId);
    if (!inc) return;
    inc.verdict = verdict;
    const run = state.run;
    if (run && !run.finishedRealTs && inc.scenarioId === run.scenarioId) {
      if ((verdict === "TP" && !inc.malicious) || (verdict === "FP" && inc.malicious)) {
        run.falsePositives += 1;
        run.fpLog.push(`Wrong verdict ${verdict} on ${inc.id}`);
      }
    }
    commit();
  },
  setStatus(incidentId: string, status: "open" | "investigating" | "contained" | "closed") {
    const inc = state.engine.incidents.find((i) => i.id === incidentId);
    if (inc) inc.status = status;
    commit();
  },
  addNote(incidentId: string, text: string) {
    const inc = state.engine.incidents.find((i) => i.id === incidentId);
    if (inc && text.trim()) inc.notes.push({ realTs: Date.now(), text: text.trim() });
    commit();
  },
  submitRun(rootCause: string, scope: string[], total: number) {
    if (!state.run) return;
    state.run = { ...state.run, rootCause, scope, finishedRealTs: Date.now() };
    state.history = [{ ...state.run, total }, ...state.history];
    commit();
  },
};
