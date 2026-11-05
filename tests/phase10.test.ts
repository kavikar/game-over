import { describe, expect, it } from "vitest";
import "@/games";
import { phase10 } from "@/games/phase10/module";
import { scoreHand } from "@/games/phase10/scoring";
import { createSession, dispatch, replay, liveActions } from "@/engine/session";
import type { Phase10Action } from "@/games/phase10/module";
import { P, testClock } from "./helpers";

const players = P("Karthik", "Rahul", "Arjun", "Sanjay");
const clock = testClock();
const round = (out: string, rows: [string, boolean, number][]): Phase10Action => ({
  type: "round",
  wentOutId: out,
  results: rows.map(([playerId, completed, points]) => ({ playerId, completed, points })),
});
const newState = (ps = players) => phase10.init(ps, phase10.defaultConfig(ps.length));
const apply = (s: ReturnType<typeof newState>, a: Phase10Action) => {
  expect(phase10.validate(s, a).filter((i) => i.severity !== "warning")).toEqual([]);
  return phase10.reduce(s, a);
};

describe("Phase 10 card scoring", () => {
  it("scores hands from card values", () => {
    expect(scoreHand({})).toBe(0);
    expect(scoreHand({ low: 3, high: 1, skip: 1, wild: 1 })).toBe(15 + 10 + 15 + 25);
    expect(scoreHand({ wild: 2 })).toBe(50);
  });
  it("rejects invalid counts", () => {
    expect(() => scoreHand({ low: -1 })).toThrow();
    expect(() => scoreHand({ skip: 1.5 })).toThrow();
  });
});

describe("Phase 10 independent progression and totals (hand-calculated)", () => {
  it("advances only players who completed their phase", () => {
    let s = newState();
    s = apply(s, round("karthik", [["karthik", true, 0], ["rahul", false, 40], ["arjun", true, 10], ["sanjay", false, 55]]));
    expect(s.phase).toEqual({ karthik: 2, rahul: 1, arjun: 2, sanjay: 1 });
    expect(s.totals).toEqual({ karthik: 0, rahul: 40, arjun: 10, sanjay: 55 });
    s = apply(s, round("arjun", [["karthik", true, 25], ["rahul", true, 5], ["arjun", true, 0], ["sanjay", false, 30]]));
    expect(s.phase).toEqual({ karthik: 3, rahul: 2, arjun: 3, sanjay: 1 });
    expect(s.totals).toEqual({ karthik: 25, rahul: 45, arjun: 10, sanjay: 85 });
    expect(phase10.outcome(s).finished).toBe(false);
  });
  it("ranks by phase then by lowest score", () => {
    let s = newState();
    s = apply(s, round("karthik", [["karthik", true, 0], ["rahul", false, 40], ["arjun", true, 10], ["sanjay", false, 55]]));
    const order = phase10.standings(s).map((x) => x.playerId);
    expect(order).toEqual(["karthik", "arjun", "rahul", "sanjay"]);
  });
});

describe("Phase 10 validation", () => {
  const s = newState();
  const ok: [string, boolean, number][] = [["karthik", true, 0], ["rahul", false, 40], ["arjun", true, 10], ["sanjay", false, 55]];
  it("accepts a valid hand", () => expect(phase10.validate(s, round("karthik", ok))).toEqual([]));
  it("requires every player", () => {
    const a = round("karthik", ok.slice(0, 3));
    expect(phase10.validate(s, a).map((i) => i.message)).toContain("Missing result for Sanjay.");
  });
  it("requires the player who went out to have completed and scored 0", () => {
    expect(phase10.validate(s, round("karthik", [["karthik", false, 0], ...ok.slice(1)])).length).toBeGreaterThan(0);
    expect(phase10.validate(s, round("karthik", [["karthik", true, 5], ...ok.slice(1)])).length).toBeGreaterThan(0);
  });
  it("rejects zero points for a player who did not go out", () => {
    expect(phase10.validate(s, round("karthik", [ok[0]!, ["rahul", false, 0], ok[2]!, ok[3]!])).length).toBeGreaterThan(0);
  });
  it("rejects non-multiples of 5 and negatives, warns on very high", () => {
    expect(phase10.validate(s, round("karthik", [ok[0]!, ["rahul", false, 42], ok[2]!, ok[3]!])).length).toBeGreaterThan(0);
    expect(phase10.validate(s, round("karthik", [ok[0]!, ["rahul", false, -5], ok[2]!, ok[3]!])).length).toBeGreaterThan(0);
    const w = phase10.validate(s, round("karthik", [ok[0]!, ["rahul", false, 300], ok[2]!, ok[3]!]));
    expect(w).toHaveLength(1);
    expect(w[0]!.severity).toBe("warning");
  });
  it("rejects duplicates and unknown players", () => {
    expect(phase10.validate(s, round("karthik", [ok[0]!, ok[0]!, ok[2]!, ok[3]!])).length).toBeGreaterThan(0);
    expect(phase10.validate(s, round("karthik", [ok[0]!, ["zed", false, 5], ok[2]!, ok[3]!])).length).toBeGreaterThan(0);
  });
});

/** Both players complete every phase; `outOf(i)` says who goes out in hand i. */
function playToPhase10(outOf: (i: number) => "x" | "y", loserPts = 5) {
  let s = newState(P("X", "Y"));
  for (let i = 1; i <= 10; i++) {
    const out = outOf(i);
    s = apply(s, round(out, [["x", true, out === "x" ? 0 : loserPts], ["y", true, out === "y" ? 0 : loserPts]]));
  }
  return s;
}

describe("Phase 10 winner determination", () => {
  it("lowest score wins when two players finish Phase 10 in the same hand", () => {
    const s = playToPhase10(() => "x", 10);
    expect(s.totals).toEqual({ x: 0, y: 100 });
    const o = phase10.outcome(s);
    expect(o).toMatchObject({ finished: true, winnerIds: ["x"] });
    expect(o.reason).toMatch(/lowest score/);
  });
  it("a single finisher wins even with a higher score", () => {
    let s = newState(P("X", "Y"));
    for (let i = 1; i <= 9; i++) s = apply(s, round("x", [["x", true, 0], ["y", true, 5]]));
    // hand 10: only X completes Phase 10; Y (also phase 10 now) fails, holds 200 points
    s = apply(s, round("x", [["x", true, 0], ["y", false, 200]]));
    expect(phase10.outcome(s)).toMatchObject({ finished: true, winnerIds: ["x"] });
  });
  it("does not end the game until someone completes Phase 10", () => {
    let s = newState(P("X", "Y"));
    for (let i = 1; i <= 9; i++) s = apply(s, round("x", [["x", true, 0], ["y", false, 5]]));
    expect(s.phase.x).toBe(10);
    expect(phase10.outcome(s).finished).toBe(false);
  });
  it("tied lowest score triggers a tiebreak hand among tied players", () => {
    const s = playToPhase10((i) => (i % 2 ? "x" : "y"));
    expect(s.totals).toEqual({ x: 25, y: 25 });
    const o = phase10.outcome(s);
    expect(o.finished).toBe(false);
    expect(s.contenders).toEqual(["x", "y"]);
    const s2 = apply(s, round("x", [["x", true, 0], ["y", true, 5]]));
    expect(phase10.outcome(s2)).toMatchObject({ finished: true, winnerIds: ["x"] });
  });
  it("tiebreak resolves for whichever tied player completes Phase 10", () => {
    const s = playToPhase10((i) => (i % 2 ? "x" : "y"));
    const s2 = apply(s, round("x", [["x", true, 0], ["y", false, 5]]));
    // x completes alone -> x wins (total 25 vs 30)
    expect(phase10.outcome(s2).winnerIds).toEqual(["x"]);
    const s3 = apply(s, round("y", [["x", false, 5], ["y", true, 0]]));
    expect(s3.winnerIds).toEqual(["y"]);
  });
  it("refuses further hands once decided", () => {
    const s = playToPhase10(() => "x", 10);
    expect(phase10.validate(s, round("x", [["x", true, 0], ["y", true, 5]])).length).toBeGreaterThan(0);
  });
});

describe("session lifecycle, audit and idempotency", () => {
  const mk = () => {
    const r = createSession(phase10, { players, config: phase10.defaultConfig(4) }, clock);
    if (!r.ok) throw new Error("create failed");
    return r.value;
  };
  const h1 = round("karthik", [["karthik", true, 0], ["rahul", false, 40], ["arjun", true, 10], ["sanjay", false, 55]]);

  it("stores the rules version and rejects invalid player counts", () => {
    expect(mk().rulesVersion).toBe(phase10.rulesVersion);
    expect(createSession(phase10, { players: P("Solo"), config: {} }, clock).ok).toBe(false);
    expect(createSession(phase10, { players: [...P("A"), ...P("A")], config: {} }, clock).ok).toBe(false);
  });
  it("ignores duplicate submissions with the same actionId", () => {
    let s = mk();
    const a = dispatch(phase10, s, { kind: "submit", actionId: "a1", action: h1 }, clock);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    s = a.value;
    const b = dispatch(phase10, s, { kind: "submit", actionId: "a1", action: h1 }, clock);
    expect(b.ok && b.duplicate).toBe(true);
    expect(liveActions(s)).toHaveLength(1);
  });
  it("undo removes the last hand but keeps the audit log", () => {
    let s = mk();
    s = (dispatch(phase10, s, { kind: "submit", actionId: "a1", action: h1 }, clock) as any).value;
    const before = s.events.length;
    s = (dispatch(phase10, s, { kind: "undo" }, clock) as any).value;
    expect(liveActions(s)).toHaveLength(0);
    expect(s.events.length).toBeGreaterThan(before);
    expect(s.events.some((e) => e.type === "action")).toBe(true);
    expect((replay(phase10, s).state as any).totals.rahul).toBe(0);
  });
  it("corrections replay later hands and are audited", () => {
    let s = mk();
    s = (dispatch(phase10, s, { kind: "submit", actionId: "a1", action: h1 }, clock) as any).value;
    const h2 = round("arjun", [["karthik", true, 25], ["rahul", true, 5], ["arjun", true, 0], ["sanjay", false, 30]]);
    s = (dispatch(phase10, s, { kind: "submit", actionId: "a2", action: h2 }, clock) as any).value;
    const target = liveActions(s)[0]!.eventId;
    const fixed = round("karthik", [["karthik", true, 0], ["rahul", false, 35], ["arjun", true, 10], ["sanjay", false, 55]]);
    const r = dispatch(phase10, s, { kind: "correct", eventId: target, action: fixed, note: "typo" }, clock);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((replay(phase10, r.value).state as any).totals.rahul).toBe(40);
    expect(s.events.filter((e) => e.type === "correct")).toHaveLength(0);
    expect(r.value.events.filter((e) => e.type === "correct")).toHaveLength(1);
    expect(liveActions(r.value)[0]!.corrected).toBe(true);
  });
  it("pause blocks scoring; resume restores it; cancel is final", () => {
    let s = mk();
    s = (dispatch(phase10, s, { kind: "pause" }, clock) as any).value;
    expect(dispatch(phase10, s, { kind: "submit", actionId: "z", action: h1 }, clock).ok).toBe(false);
    s = (dispatch(phase10, s, { kind: "resume" }, clock) as any).value;
    expect(dispatch(phase10, s, { kind: "submit", actionId: "z", action: h1 }, clock).ok).toBe(true);
    s = (dispatch(phase10, s, { kind: "cancel" }, clock) as any).value;
    expect(dispatch(phase10, s, { kind: "undo" }, clock).ok).toBe(false);
  });
  it("auto-completes on win and reopens when the deciding hand is undone", () => {
    const ps = P("X", "Y");
    let s = (createSession(phase10, { players: ps, config: {} }, clock) as any).value;
    for (let i = 1; i <= 10; i++)
      s = (dispatch(phase10, s, { kind: "submit", actionId: `h${i}`, action: round("x", [["x", true, 0], ["y", true, 5]]) }, clock) as any).value;
    expect(s.status).toBe("completed");
    s = (dispatch(phase10, s, { kind: "undo" }, clock) as any).value;
    expect(s.status).toBe("active");
  });
  it("invalid actions never enter the log", () => {
    const s = mk();
    const bad = dispatch(phase10, s, { kind: "submit", actionId: "bad", action: { type: "round" } }, clock);
    expect(bad.ok).toBe(false);
  });
});
