import { z } from "zod";
import type { GameModule, Issue, PlayerRef } from "@/engine/types";
import { nameOf, rankBy } from "@/engine/util";
import { ONO99_RULES_VERSION, ono99Rules } from "./rules";

export const LIMIT = 99;

export const configSchema = z.object({
  startingLives: z.number().int().min(1).max(10).default(3),
  skipCard: z.boolean().default(false),
});
export type Ono99Config = z.infer<typeof configSchema>;

export const cardSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("number"), value: z.number().int().min(0).max(9) }),
  z.object({ kind: z.literal("minus10") }),
  z.object({ kind: z.literal("reverse") }),
  z.object({ kind: z.literal("play2") }),
  z.object({ kind: z.literal("ono99") }),
  z.object({ kind: z.literal("skip") }),
]);
export type Ono99Card = z.infer<typeof cardSchema>;

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play"), playerId: z.string().min(1), card: cardSchema }),
  /** The player had no legal card and loses a life. */
  z.object({ type: z.literal("bust"), playerId: z.string().min(1) }),
]);
export type Ono99Action = z.infer<typeof actionSchema>;

export interface Ono99State {
  players: PlayerRef[];
  config: Ono99Config;
  lives: Record<string, number>;
  pile: number;
  current: number; // index in players
  direction: 1 | -1;
  /** Turns the current player still owes (Play 2 gives the next player 2). */
  turnsLeft: number;
  round: number;
  eliminated: string[]; // in order of elimination
  log: { round: number; text: string; pile: number }[];
  roundLosers: { round: number; playerId: string }[];
}

const alive = (s: Ono99State) => s.players.filter((p) => s.lives[p.id]! > 0);

function advance(s: Ono99State, steps = 1): number {
  let i = s.current;
  const n = s.players.length;
  let left = steps;
  while (left > 0) {
    do i = (i + s.direction + n) % n; while (s.lives[s.players[i]!.id]! <= 0);
    left--;
  }
  return i;
}

export function legalCards(s: Ono99State): Ono99Card[] {
  const cards: Ono99Card[] = [];
  for (let v = 0; v <= 9; v++) if (s.pile + v <= LIMIT) cards.push({ kind: "number", value: v });
  if (s.pile >= 10) cards.push({ kind: "minus10" });
  cards.push({ kind: "reverse" }, { kind: "play2" }, { kind: "ono99" });
  if (s.config.skipCard) cards.push({ kind: "skip" });
  return cards;
}

export const ono99: GameModule<Ono99Config, Ono99State, Ono99Action> = {
  meta: {
    id: "ono99",
    name: "ONO 99",
    tagline: "Keep it under 99.",
    description: "A shared running total, a handful of cards, and a lot of nerve. Go over and you lose a life.",
    categories: ["Card Games", "Party Games", "Family Games"],
    minPlayers: 2,
    maxPlayers: 6,
    duration: [15, 30],
    scoringType: "Gameplay state: pile value, turns and lives",
    editions: ["2022 Mattel"],
    cover: { bg: "#242522", fg: "#F5F0E6", accent: "#C87554", motif: "pile" },
  },
  rulesVersion: ONO99_RULES_VERSION,
  rules: ono99Rules,
  configSchema,
  actionSchema,
  defaultConfig: () => ({ startingLives: 3, skipCard: false }),
  setupFields: () => [
    { key: "startingLives", label: "Starting lives", type: "number", group: "variant", status: "unverified", min: 1, max: 10, help: "Sources disagree on the official number. Check your rule sheet." },
    { key: "skipCard", label: "Skip card in deck", type: "toggle", group: "house", status: "unverified" },
  ],
  validateSetup: () => [],
  init: (players, config) => ({
    players, config,
    lives: Object.fromEntries(players.map((p) => [p.id, config.startingLives])),
    pile: 0, current: 0, direction: 1, turnsLeft: 1, round: 1, eliminated: [], log: [], roundLosers: [],
  }),
  validate(state, a) {
    const issues: Issue[] = [];
    if (alive(state).length <= 1) return [{ message: "The game is over." }];
    const cur = state.players[state.current]!;
    if (a.playerId !== cur.id) issues.push({ message: `It is ${cur.name}'s turn, not ${nameOf(state.players, a.playerId)}'s.` });
    if (a.type === "play") {
      const c = a.card;
      if (c.kind === "number" && state.pile + c.value > LIMIT) issues.push({ message: `${state.pile} + ${c.value} goes over ${LIMIT}.` });
      if (c.kind === "minus10" && state.pile < 10) issues.push({ message: "The total cannot go below 0." });
      if (c.kind === "skip" && !state.config.skipCard) issues.push({ message: "Skip is not enabled for this game." });
    }
    return issues;
  },
  reduce(state, a) {
    const s: Ono99State = { ...state, lives: { ...state.lives }, eliminated: [...state.eliminated], log: [...state.log], roundLosers: [...state.roundLosers] };
    const who = nameOf(s.players, a.playerId);
    if (a.type === "bust") {
      s.lives[a.playerId] = s.lives[a.playerId]! - 1;
      s.roundLosers.push({ round: s.round, playerId: a.playerId });
      if (s.lives[a.playerId]! <= 0) s.eliminated.push(a.playerId);
      s.log.push({ round: s.round, text: `${who} could not play and lost a life${s.lives[a.playerId]! <= 0 ? " (eliminated)" : ""}`, pile: s.pile });
      s.pile = 0;
      s.round += 1;
      s.direction = 1;
      s.turnsLeft = 1;
      if (alive(s).length > 1) s.current = advance(s, 1);
      return s;
    }
    const c = a.card;
    let text = "";
    let extra = 0; // additional steps (skip)
    switch (c.kind) {
      case "number": s.pile += c.value; text = `${who} played ${c.value}`; break;
      case "minus10": s.pile -= 10; text = `${who} played −10`; break;
      case "reverse": s.direction = (s.direction * -1) as 1 | -1; text = `${who} played Reverse`; break;
      case "play2": text = `${who} played Play 2`; break;
      case "ono99": s.pile = LIMIT; text = `${who} played ONO 99`; break;
      case "skip": extra = 1; text = `${who} played Skip`; break;
    }
    s.log.push({ round: s.round, text: `${text} → ${s.pile}`, pile: s.pile });
    if (state.turnsLeft > 1) { s.turnsLeft = state.turnsLeft - 1; return s; }
    // Two players: Reverse acts like Skip is a rule some sheets include; not assumed here.
    s.current = advance(s, 1 + extra);
    s.turnsLeft = c.kind === "play2" ? 2 : 1;
    return s;
  },
  standings(s) {
    const items = s.players.map((p) => ({
      playerId: p.id,
      lives: s.lives[p.id]!,
      out: s.eliminated.indexOf(p.id),
    }));
    return rankBy(items, (a, b) => {
      if ((a.lives > 0) !== (b.lives > 0)) return a.lives > 0 ? -1 : 1;
      if (a.lives > 0) return b.lives - a.lives;
      return b.out - a.out; // eliminated later => better
    }).map((r) => ({
      playerId: r.playerId, rank: r.rank, value: r.lives, display: `${r.lives}`,
      detail: r.lives > 0 ? `${r.lives} ${r.lives === 1 ? "life" : "lives"}` : "Eliminated", eliminated: r.lives <= 0,
    }));
  },
  outcome(s) {
    const a = alive(s);
    if (a.length === 1) return { finished: true, winnerIds: [a[0]!.id], reason: `${a[0]!.name} is the last player with a life.` };
    return { finished: false, winnerIds: [], reason: "Last player with a life wins." };
  },
  progressLabel: (s) => `Round ${s.round} · pile ${s.pile}`,
  history(s) {
    return {
      columns: [{ id: "event", label: "Round losses" }],
      rows: s.roundLosers.map((r) => ({ label: `Round ${r.round}`, cells: { event: `${nameOf(s.players, r.playerId)} −1 life` } })),
    };
  },
  describeAction(s, a) {
    return a.type === "bust" ? `${nameOf(s.players, a.playerId)} loses a life` : `${nameOf(s.players, a.playerId)} plays ${a.card.kind === "number" ? a.card.value : a.card.kind}`;
  },
};
