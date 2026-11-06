import type { Incident } from "./engine";

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}
/** MTTD = acknowledge − first malicious event; MTTR = first containment − acknowledge. */
export function mttd(incs: Incident[]) {
  return mean(incs.filter((i) => i.ackRealTs).map((i) => (i.ackRealTs! - i.firstEventRealTs) / 1000));
}
export function mttr(incs: Incident[]) {
  return mean(incs.filter((i) => i.ackRealTs && i.containedRealTs).map((i) => Math.max(0, (i.containedRealTs! - i.ackRealTs!) / 1000)));
}
