import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, ingest, scoreRun } from "./engine";
import { SCENARIOS } from "./scenarios";

describe("SentinelLab engine", () => {
  it("escalates Scenario 1 to INCIDENT_CRITICAL in one correlated incident", () => {
    const s = createInitialState();
    for (const d of SCENARIOS[0]!.build()) ingest(s, d, Date.now());
    const crit = s.incidents.filter((i) => i.state === "INCIDENT_CRITICAL");
    expect(crit).toHaveLength(1);
    expect(crit[0]!.techniques).toEqual(expect.arrayContaining(["T1110.004", "T1078", "T1068", "T1485"]));
  });

  it("marks events from an isolated host as BLOCKED_BY_POLICY", () => {
    const s = createInitialState();
    applyAction(s, "ISOLATE_HOST", "LAB-PC-01", Date.now());
    for (const d of SCENARIOS[1]!.build()) ingest(s, d, Date.now());
    expect(s.events.every((e) => e.status === "BLOCKED_BY_POLICY")).toBe(true);
    expect(s.alerts).toHaveLength(0);
  });

  it("deducts 15 points per false positive", () => {
    const base = { mttdSec: 10, mttrSec: 10, rootCauseCorrect: true, scopeSelected: ["a"], scopeTruth: ["a"] };
    expect(scoreRun({ ...base, falsePositives: 0 }).total).toBe(100);
    expect(scoreRun({ ...base, falsePositives: 2 }).total).toBe(70);
  });
});
