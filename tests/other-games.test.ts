import { describe, expect, it } from "vitest";
import { uno, type UnoAction } from "@/games/uno/module";
import { scoreUnoHand } from "@/games/uno/scoring";
import { ticketToRide, type TtrAction } from "@/games/ticket-to-ride/module";
import { scoreEntry } from "@/games/ticket-to-ride/scoring";
import { ono99, legalCards, type Ono99Action } from "@/games/ono99/module";
import { poker, net, tournamentPayouts, fmtMoney, type PokerAction } from "@/games/poker/module";
import { P } from "./helpers";

const ok = <S, A>(m: { validate(s: S, a: A): { severity?: string }[]; reduce(s: S, a: A): S }, s: S, a: A) => {
  expect(m.validate(s, a).filter((i) => i.severity !== "warning")).toEqual([]);
  return m.reduce(s, a);
};

describe("UNO", () => {
  const ps = P("A", "B", "C");
  const r = (winnerId: string, hands: [string, number][]): UnoAction => ({ type: "round", winnerId, hands: hands.map(([playerId, points]) => ({ playerId, points })) });
  it("counts hands", () => {
    expect(scoreUnoHand({ numberSum: 17, actions: 2, wilds: 1 })).toBe(17 + 40 + 50);
    expect(() => scoreUnoHand({ wilds: -1 })).toThrow();
  });
  it("traditional: winner collects, first to target wins", () => {
    let s = uno.init(ps, { mode: "traditional", target: 100 });
    s = ok(uno, s, r("a", [["b", 30], ["c", 45]]));
    s = ok(uno, s, r("b", [["a", 20], ["c", 50]]));
    expect(s.totals).toEqual({ a: 75, b: 70, c: 0 });
    expect(uno.outcome(s).finished).toBe(false);
    s = ok(uno, s, r("a", [["b", 25], ["c", 10]]));
    expect(s.totals.a).toBe(110);
    expect(uno.outcome(s)).toMatchObject({ finished: true, winnerIds: ["a"] });
  });
  it("lowest mode: tie for lowest keeps the game open until broken", () => {
    let s = uno.init(ps, { mode: "lowest", target: 100 });
    s = ok(uno, s, r("a", [["b", 50], ["c", 100]]));
    s = ok(uno, s, r("b", [["a", 50], ["c", 0]]));
    expect(s.totals).toEqual({ a: 50, b: 50, c: 100 });
    expect(uno.outcome(s).finished).toBe(false);
    s = ok(uno, s, r("a", [["b", 5], ["c", 5]]));
    expect(uno.outcome(s)).toMatchObject({ finished: true, winnerIds: ["a"] });
  });
  it("lowest-wins mode: each player accumulates their own hand points", () => {
    let s = uno.init(ps, { mode: "lowest", target: 100 });
    s = ok(uno, s, r("a", [["b", 30], ["c", 45]]));
    s = ok(uno, s, r("b", [["a", 20], ["c", 50]]));
    expect(s.totals).toEqual({ a: 20, b: 30, c: 95 });
    s = ok(uno, s, r("a", [["b", 25], ["c", 10]]));
    expect(s.totals).toEqual({ a: 20, b: 55, c: 105 });
    expect(uno.outcome(s)).toMatchObject({ finished: true, winnerIds: ["a"] });
  });
  it("validates inputs", () => {
    const s = uno.init(ps, uno.defaultConfig(3));
    expect(uno.validate(s, r("a", [["b", 5]])).length).toBeGreaterThan(0); // missing c
    expect(uno.validate(s, r("a", [["b", 5], ["c", -1]])).length).toBeGreaterThan(0);
    expect(uno.validate(s, r("a", [["a", 0], ["b", 5], ["c", 5]])).length).toBeGreaterThan(0);
    expect(uno.validate(s, r("z", [["b", 5], ["c", 5]])).length).toBeGreaterThan(0);
  });
});

describe("Ticket to Ride", () => {
  const ps = P("Alice", "Bob");
  it("scores routes per edition table", () => {
    expect(scoreEntry("usa", { routes: { "3": 2, "4": 1, "6": 1 }, ticketsCompleted: 33, ticketsFailed: 8, longestPath: true }).total).toBe(30 + 33 - 8 + 10);
    expect(scoreEntry("europe", { routes: { "8": 1, "1": 2 }, ticketsCompleted: 0, ticketsFailed: 0, stationsUnused: 2 }).total).toBe(21 + 2 + 8);
    expect(() => scoreEntry("europe", { routes: { "5": 1 }, ticketsCompleted: 0, ticketsFailed: 0 })).toThrow();
  });
  const entry = (playerId: string, extra: Partial<TtrAction["entries"][number]>): TtrAction["entries"][number] => ({
    playerId, routes: {}, ticketsCompleted: 0, ticketsFailed: 0, ticketCount: 0, stationsUnused: 0, longestPath: false, ...extra,
  });
  it("determines the winner by total", () => {
    let s = ticketToRide.init(ps, { edition: "usa" });
    s = ok(ticketToRide, s, { type: "final", entries: [
      entry("alice", { routes: { "3": 2, "4": 1, "6": 1 }, ticketsCompleted: 33, ticketsFailed: 8, longestPath: true }),
      entry("bob", { routes: { "1": 3, "2": 4, "5": 2 }, ticketsCompleted: 22 }),
    ] });
    expect(s.scores!.alice!.total).toBe(65);
    expect(s.scores!.bob!.total).toBe(53);
    expect(ticketToRide.outcome(s)).toMatchObject({ finished: true, winnerIds: ["alice"] });
  });
  it("USA tie goes to longest path; Europe tie goes to most tickets", () => {
    let s = ticketToRide.init(ps, { edition: "usa" });
    s = ok(ticketToRide, s, { type: "final", entries: [entry("alice", { ticketsCompleted: 40, longestPath: false }), entry("bob", { ticketsCompleted: 30, longestPath: true })] });
    expect(ticketToRide.outcome(s).winnerIds).toEqual(["bob"]);
    let e = ticketToRide.init(ps, { edition: "europe" });
    e = ok(ticketToRide, e, { type: "final", entries: [entry("alice", { ticketsCompleted: 30, ticketCount: 3 }), entry("bob", { ticketsCompleted: 30, ticketCount: 5 })] });
    expect(ticketToRide.outcome(e).winnerIds).toEqual(["bob"]);
  });
  it("shares the win when still tied", () => {
    let s = ticketToRide.init(ps, { edition: "usa" });
    s = ok(ticketToRide, s, { type: "final", entries: [entry("alice", { ticketsCompleted: 30 }), entry("bob", { ticketsCompleted: 30 })] });
    expect(ticketToRide.outcome(s).winnerIds.sort()).toEqual(["alice", "bob"]);
  });
  it("rejects bad edition inputs", () => {
    const s = ticketToRide.init(ps, { edition: "europe" });
    expect(ticketToRide.validate(s, { type: "final", entries: [entry("alice", { routes: { "5": 1 } }), entry("bob", {})] }).filter((i) => i.severity !== "warning").length).toBe(1);
    const u = ticketToRide.init(ps, { edition: "usa" });
    expect(ticketToRide.validate(u, { type: "final", entries: [entry("alice", { stationsUnused: 2 }), entry("bob", {})] }).filter((i) => i.severity !== "warning").length).toBe(1);
    expect(ticketToRide.validate(u, { type: "final", entries: [entry("alice", {})] }).length).toBeGreaterThan(0);
  });
});

describe("ONO 99", () => {
  const ps = P("A", "B", "C");
  const play = (playerId: string, card: Ono99Action extends infer T ? any : never): Ono99Action => ({ type: "play", playerId, card });
  const num = (v: number) => ({ kind: "number", value: v });
  const init = (lives = 2) => ono99.init(ps, { startingLives: lives, skipCard: false });
  it("tracks pile, turn order, reverse and play 2", () => {
    let s = init();
    s = ok(ono99, s, play("a", num(5)));
    s = ok(ono99, s, play("b", num(9)));
    expect(s.pile).toBe(14);
    expect(s.players[s.current]!.id).toBe("c");
    s = ok(ono99, s, play("c", { kind: "reverse" }));
    expect(s.players[s.current]!.id).toBe("b");
    s = ok(ono99, s, play("b", { kind: "play2" }));
    expect(s.players[s.current]!.id).toBe("a");
    expect(s.turnsLeft).toBe(2);
    s = ok(ono99, s, play("a", num(3)));
    expect(s.players[s.current]!.id).toBe("a"); // second of two turns
    s = ok(ono99, s, play("a", { kind: "minus10" }));
    expect(s.pile).toBe(7);
    expect(s.players[s.current]!.id).toBe("c");
  });
  it("rejects wrong turn, going over 99, negative totals", () => {
    let s = init();
    expect(ono99.validate(s, play("b", num(1))).length).toBe(1);
    expect(ono99.validate(s, play("a", { kind: "minus10" })).length).toBe(1);
    expect(ono99.validate(s, play("a", { kind: "skip" })).length).toBe(1);
    s = ok(ono99, s, play("a", { kind: "ono99" }));
    expect(s.pile).toBe(99);
    expect(ono99.validate(s, play("b", num(1))).length).toBe(1);
    expect(legalCards(s).some((c) => c.kind === "number" && c.value > 0)).toBe(false);
    expect(legalCards(s).some((c) => c.kind === "number" && c.value === 0)).toBe(true);
  });
  it("bust costs a life, resets the pile, starts next round", () => {
    let s = init();
    s = ok(ono99, s, play("a", { kind: "ono99" }));
    s = ok(ono99, s, { type: "bust", playerId: "b" });
    expect(s.lives.b).toBe(1);
    expect(s.pile).toBe(0);
    expect(s.round).toBe(2);
    expect(s.players[s.current]!.id).toBe("c");
  });
  it("eliminates players, skips them, and declares the last survivor", () => {
    let s = init(1);
    s = ok(ono99, s, { type: "bust", playerId: "a" }); // a out, b's turn
    expect(s.eliminated).toEqual(["a"]);
    expect(s.players[s.current]!.id).toBe("b");
    s = ok(ono99, s, play("b", num(4)));
    expect(s.players[s.current]!.id).toBe("c"); // a skipped on wrap too
    s = ok(ono99, s, play("c", num(4)));
    expect(s.players[s.current]!.id).toBe("b");
    s = ok(ono99, s, { type: "bust", playerId: "b" });
    expect(ono99.outcome(s)).toMatchObject({ finished: true, winnerIds: ["c"] });
    expect(ono99.standings(s).map((x) => x.playerId)).toEqual(["c", "b", "a"]);
    expect(ono99.validate(s, play("c", num(1))).length).toBe(1);
  });
});

describe("Poker", () => {
  const ps = P("A", "B", "C");
  const cash = () => poker.init(ps, { mode: "cash", buyIn: 2000, chipsPerBuyIn: 2000, allowRebuys: true, payouts: [100] });
  it("cash game: rebuy, cash-outs and net (cents-exact)", () => {
    let s = cash();
    s = ok(poker, s, { type: "rebuy", playerId: "a" });
    expect(s.buyIns.a).toBe(2);
    s = ok(poker, s, { type: "cashOut", playerId: "a", chips: 6500 });
    s = ok(poker, s, { type: "cashOut", playerId: "b", chips: 1000 });
    const last: PokerAction = { type: "cashOut", playerId: "c", chips: 500 };
    expect(poker.validate(s, last)).toEqual([]); // 6500+1000+500 = 8000 = 4 buy-ins
    s = poker.reduce(s, last);
    expect([net(s, "a"), net(s, "b"), net(s, "c")]).toEqual([2500, -1000, -1500]);
    expect(poker.outcome(s)).toMatchObject({ finished: true, winnerIds: ["a"] });
    expect(poker.standings(s)[0]).toMatchObject({ playerId: "a", display: "+25.00" });
  });
  it("warns when chips do not balance", () => {
    let s = cash();
    s = ok(poker, s, { type: "cashOut", playerId: "a", chips: 3000 });
    s = ok(poker, s, { type: "cashOut", playerId: "b", chips: 1000 });
    const v = poker.validate(s, { type: "cashOut", playerId: "c", chips: 1000 });
    expect(v).toHaveLength(1);
    expect(v[0]!.severity).toBe("warning");
  });
  it("blocks actions after leaving, and disallowed rebuys / wrong-mode actions", () => {
    let s = cash();
    s = ok(poker, s, { type: "cashOut", playerId: "a", chips: 100 });
    expect(poker.validate(s, { type: "cashOut", playerId: "a", chips: 1 }).length).toBe(1);
    expect(poker.validate(s, { type: "bust", playerId: "b" }).length).toBe(1);
    const nr = poker.init(ps, { ...poker.defaultConfig(3), allowRebuys: false });
    expect(poker.validate(nr, { type: "rebuy", playerId: "a" }).length).toBe(1);
  });
  it("tournament: last standing wins, payouts split the pool exactly", () => {
    let s = poker.init(ps, { mode: "tournament", buyIn: 2000, chipsPerBuyIn: 1000, allowRebuys: false, payouts: [60, 40] });
    s = ok(poker, s, { type: "bust", playerId: "c" });
    s = ok(poker, s, { type: "bust", playerId: "b" });
    expect(tournamentPayouts(s)).toEqual([3600, 2400]);
    expect(poker.outcome(s)).toMatchObject({ finished: true, winnerIds: ["a"] });
    expect([net(s, "a"), net(s, "b"), net(s, "c")]).toEqual([1600, 400, -2000]);
    expect(poker.standings(s).map((x) => x.playerId)).toEqual(["a", "b", "c"]);
  });
  it("odd cents in payouts go to first place", () => {
    const s = poker.init(P("A", "B", "C"), { mode: "tournament", buyIn: 1001, chipsPerBuyIn: 1, allowRebuys: false, payouts: [50, 50] });
    const pay = tournamentPayouts(s);
    expect(pay[0]! + pay[1]!).toBe(3003);
  });
  it("validates setup payouts and formats money", () => {
    expect(poker.validateSetup(ps, { ...poker.defaultConfig(3), payouts: [60, 30] }).length).toBe(1);
    expect(fmtMoney(-1250)).toBe("−12.50");
    expect(fmtMoney(5, true)).toBe("+0.05");
  });
});
