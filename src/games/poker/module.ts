import { z } from "zod";
import type { GameModule, Issue, PlayerRef } from "@/engine/types";
import { nameOf, rankBy, sum } from "@/engine/util";
import { POKER_RULES_VERSION, pokerRules } from "./rules";

export const configSchema = z.object({
  mode: z.enum(["cash", "tournament"]).default("cash"),
  /** Price of one buy-in, in cents. */
  buyIn: z.number().int().min(0).max(10_000_000).default(2000),
  /** Chips received per buy-in. */
  chipsPerBuyIn: z.number().int().min(1).max(100_000_000).default(2000),
  allowRebuys: z.boolean().default(true),
  /** Tournament payouts for 1st, 2nd... as percentages (must total 100). */
  payouts: z.array(z.number().int().min(0).max(100)).min(1).default([100]),
});
export type PokerConfig = z.infer<typeof configSchema>;

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rebuy"), playerId: z.string().min(1) }),
  z.object({ type: z.literal("chipCount"), playerId: z.string().min(1), chips: z.number().int().min(0) }),
  z.object({ type: z.literal("cashOut"), playerId: z.string().min(1), chips: z.number().int().min(0) }),
  z.object({ type: z.literal("bust"), playerId: z.string().min(1) }),
]);
export type PokerAction = z.infer<typeof actionSchema>;

export interface PokerState {
  players: PlayerRef[];
  config: PokerConfig;
  buyIns: Record<string, number>; // count of buy-ins incl. the first
  chips: Record<string, number>; // last recorded chip count
  cashedOut: Record<string, number>; // chips taken out
  busted: string[]; // order of elimination (tournament)
  log: string[];
}

const chipValueCents = (c: PokerConfig) => c.buyIn / c.chipsPerBuyIn;
export const invested = (s: PokerState, id: string) => s.buyIns[id]! * s.config.buyIn;
const inPlay = (s: PokerState) => s.players.filter((p) => !(p.id in s.cashedOut) && !s.busted.includes(p.id));
export const totalChipsIssued = (s: PokerState) => sum(Object.values(s.buyIns)) * s.config.chipsPerBuyIn;

/** Tournament payout in cents by finishing place (1-based). Remainder cents go to 1st. */
export function tournamentPayouts(s: PokerState): number[] {
  const pool = sum(Object.values(s.buyIns)) * s.config.buyIn;
  const out = s.config.payouts.map((p) => Math.floor((pool * p) / 100));
  out[0] = (out[0] ?? 0) + (pool - sum(out));
  return out;
}

function placeOf(s: PokerState, id: string): number | null {
  const winner = s.config.mode === "tournament" && inPlay(s).length === 1 ? inPlay(s)[0]!.id : null;
  if (id === winner) return 1;
  const i = s.busted.indexOf(id);
  return i < 0 ? null : s.players.length - i;
}

export function net(s: PokerState, id: string): number {
  const inv = invested(s, id);
  if (s.config.mode === "cash") {
    // Cashed out: settled value. Still playing: marked to the last recorded chip count.
    const chips = s.cashedOut[id] ?? s.chips[id]!;
    return Math.round(chips * chipValueCents(s.config)) - inv;
  }
  const place = placeOf(s, id);
  const pay = place ? (tournamentPayouts(s)[place - 1] ?? 0) : 0;
  return (s.config.mode === "tournament" && place === null ? 0 : pay) - inv;
}

export const poker: GameModule<PokerConfig, PokerState, PokerAction> = {
  meta: {
    id: "poker",
    name: "Poker Night",
    tagline: "Buy-ins, rebuys, cash-outs.",
    description: "A bankroll and chip tracker for home cash games and tournaments. It never deals or ranks hands.",
    categories: ["Poker and Casino-style Games", "Card Games"],
    minPlayers: 2,
    maxPlayers: 10,
    duration: [60, 240],
    scoringType: "Chip stacks, buy-ins and net result",
    editions: ["Cash game", "Tournament"],
    cover: { bg: "#8A9275", fg: "#242522", accent: "#F5F0E6", motif: "chips" },
  },
  rulesVersion: POKER_RULES_VERSION,
  rules: pokerRules,
  configSchema,
  actionSchema,
  defaultConfig: () => ({ mode: "cash", buyIn: 2000, chipsPerBuyIn: 2000, allowRebuys: true, payouts: [100] }),
  setupFields: (c) => [
    { key: "mode", label: "Format", type: "select", group: "variant", status: "interpretation", options: [{ value: "cash", label: "Cash game" }, { value: "tournament", label: "Tournament" }] },
    { key: "buyIn", label: "Buy-in", type: "money", group: "session", status: "interpretation", min: 0, help: "Cost of one buy-in." },
    { key: "chipsPerBuyIn", label: "Chips per buy-in", type: "number", group: "session", status: "interpretation", min: 1, step: 100 },
    { key: "allowRebuys", label: "Allow rebuys", type: "toggle", group: "house", status: "house" },
    ...(c.mode === "tournament"
      ? [{ key: "payouts", label: "Payouts by place (%)", type: "percents" as const, group: "session" as const, status: "interpretation" as const, help: "Comma-separated, must total 100. Example: 60, 40" }]
      : []),
  ],
  validateSetup(_p, c) {
    const issues: Issue[] = [];
    if (sum(c.payouts) !== 100) issues.push({ message: "Payout percentages must total 100." });
    return issues;
  },
  init: (players, config) => ({
    players, config,
    buyIns: Object.fromEntries(players.map((p) => [p.id, 1])),
    chips: Object.fromEntries(players.map((p) => [p.id, config.chipsPerBuyIn])),
    cashedOut: {}, busted: [], log: [],
  }),
  validate(s, a) {
    const issues: Issue[] = [];
    if (!s.players.some((p) => p.id === a.playerId)) return [{ message: "Unknown player." }];
    const who = nameOf(s.players, a.playerId);
    const gone = a.playerId in s.cashedOut || s.busted.includes(a.playerId);
    if (a.type !== "rebuy" && gone) issues.push({ message: `${who} has already left the game.` });
    if (a.type === "rebuy") {
      if (!s.config.allowRebuys) issues.push({ message: "Rebuys are turned off." });
      if (gone && s.config.mode === "tournament") issues.push({ message: `${who} is out. Undo the bust to rebuy.` });
      if (a.playerId in s.cashedOut) issues.push({ message: `${who} cashed out. Undo the cash-out first.` });
    }
    if (a.type === "bust" && s.config.mode !== "tournament") issues.push({ message: "Busting applies to tournaments. Use cash-out of 0 chips instead." });
    if (a.type === "cashOut" && s.config.mode !== "cash") issues.push({ message: "Cash-outs apply to cash games." });
    if (a.type === "cashOut" && !issues.length) {
      const remaining = inPlay(s).length;
      if (remaining === 1) {
        const out = sum(Object.values(s.cashedOut)) + a.chips;
        const issued = totalChipsIssued(s);
        if (out !== issued)
          issues.push({ message: `Chips do not balance: cashed out ${out}, bought ${issued} (${out - issued > 0 ? "+" : ""}${out - issued}).`, severity: "warning" });
      }
    }
    return issues;
  },
  reduce(s, a) {
    const n: PokerState = { ...s, buyIns: { ...s.buyIns }, chips: { ...s.chips }, cashedOut: { ...s.cashedOut }, busted: [...s.busted], log: [...s.log] };
    const who = nameOf(s.players, a.playerId);
    switch (a.type) {
      case "rebuy": n.buyIns[a.playerId] = n.buyIns[a.playerId]! + 1; n.chips[a.playerId] = n.chips[a.playerId]! + s.config.chipsPerBuyIn; n.log.push(`${who} rebought`); break;
      case "chipCount": n.chips[a.playerId] = a.chips; n.log.push(`${who} now has ${a.chips} chips`); break;
      case "cashOut": n.cashedOut[a.playerId] = a.chips; n.chips[a.playerId] = 0; n.log.push(`${who} cashed out ${a.chips} chips`); break;
      case "bust": n.busted.push(a.playerId); n.chips[a.playerId] = 0; n.log.push(`${who} busted`); break;
    }
    return n;
  },
  standings(s) {
    const items = s.players.map((p) => ({ playerId: p.id, net: net(s, p.id), left: !(p.id in s.cashedOut) && !s.busted.includes(p.id) }));
    const tour = s.config.mode === "tournament";
    return rankBy(items, (a, b) => {
      if (tour) {
        const pa = placeOf(s, a.playerId), pb = placeOf(s, b.playerId);
        if (pa && pb) return pa - pb;
        if (pa) return -1;
        if (pb) return 1;
        const ca = s.chips[a.playerId]!, cb = s.chips[b.playerId]!;
        return cb - ca;
      }
      return b.net - a.net;
    }).map((r) => ({
      playerId: r.playerId, rank: r.rank, value: r.net,
      display: tour && r.left && inPlay(s).length > 1 ? `${s.chips[r.playerId]}` : fmtMoney(r.net, true),
      detail: `${s.buyIns[r.playerId]} buy-in${s.buyIns[r.playerId]! > 1 ? "s" : ""} · ${r.left ? `${s.chips[r.playerId]} chips` : r.playerId in s.cashedOut ? `cashed ${s.cashedOut[r.playerId]}` : "busted"}`,
    }));
  },
  outcome(s) {
    if (s.config.mode === "tournament") {
      const left = inPlay(s);
      if (left.length === 1) return { finished: true, winnerIds: [left[0]!.id], reason: `${left[0]!.name} is the last player standing.` };
      return { finished: false, winnerIds: [], reason: `${left.length} players remain.` };
    }
    if (inPlay(s).length === 0) {
      const best = Math.max(...s.players.map((p) => net(s, p.id)));
      return { finished: true, winnerIds: s.players.filter((p) => net(s, p.id) === best).map((p) => p.id), reason: "Everyone has cashed out. Highest net result wins." };
    }
    return { finished: false, winnerIds: [], reason: `${inPlay(s).length} still at the table.` };
  },
  progressLabel: (s) => `${inPlay(s).length} at the table · ${sum(Object.values(s.buyIns))} buy-ins`,
  history(s) {
    return { columns: [{ id: "e", label: "Event" }], rows: s.log.map((l, i) => ({ label: `#${i + 1}`, cells: { e: l } })) };
  },
  describeAction(s, a) {
    const w = nameOf(s.players, a.playerId);
    return a.type === "rebuy" ? `${w} rebuys` : a.type === "bust" ? `${w} busts` : a.type === "cashOut" ? `${w} cashes out ${a.chips}` : `${w}: ${a.chips} chips`;
  },
};

export function fmtMoney(cents: number, signed = false): string {
  const sign = cents < 0 ? "−" : signed && cents > 0 ? "+" : "";
  return `${sign}${(Math.abs(cents) / 100).toFixed(2)}`;
}
