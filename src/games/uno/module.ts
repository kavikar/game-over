import { z } from "zod";
import type { GameModule, Issue, PlayerRef } from "@/engine/types";
import { nameOf, rankBy, sum } from "@/engine/util";
import { UNO_RULES_VERSION, unoRules } from "./rules";

export const configSchema = z.object({
  mode: z.enum(["traditional", "lowest"]).default("traditional"),
  target: z.number().int().min(50).max(5000).default(500),
});
export type UnoConfig = z.infer<typeof configSchema>;

export const actionSchema = z.object({
  type: z.literal("round"),
  winnerId: z.string().min(1),
  /** Points left in each NON-winning player's hand. */
  hands: z.array(z.object({ playerId: z.string().min(1), points: z.number().int() })),
});
export type UnoAction = z.infer<typeof actionSchema>;

export interface UnoState {
  players: PlayerRef[];
  config: UnoConfig;
  totals: Record<string, number>;
  rounds: { number: number; winnerId: string; hands: Record<string, number>; gained: Record<string, number> }[];
  winnerIds: string[];
  /** Players who reached the target but are tied (game continues). */
  tied: boolean;
}

const MAX_HAND = 1000;

function decide(s: UnoState): { winnerIds: string[]; tied: boolean } {
  const { mode, target } = s.config;
  const reached = s.players.filter((p) => s.totals[p.id]! >= target);
  if (!reached.length) return { winnerIds: [], tied: false };
  const pool = mode === "traditional" ? reached : s.players;
  const pick = mode === "traditional" ? Math.max : Math.min;
  const best = pick(...pool.map((p) => s.totals[p.id]!));
  const w = pool.filter((p) => s.totals[p.id] === best).map((p) => p.id);
  return w.length === 1 ? { winnerIds: w, tied: false } : { winnerIds: [], tied: true };
}

export const uno: GameModule<UnoConfig, UnoState, UnoAction> = {
  meta: {
    id: "uno",
    name: "UNO",
    tagline: "Last card, loudest voice.",
    description: "Match colors and numbers, empty your hand first, and collect the points left in everyone else's hand.",
    categories: ["Card Games", "Family Games", "Party Games"],
    minPlayers: 2,
    maxPlayers: 10,
    duration: [20, 60],
    scoringType: "Cumulative hand points to a target",
    editions: ["Classic"],
    cover: { bg: "#C87554", fg: "#F5F0E6", accent: "#242522", motif: "cards" },
  },
  rulesVersion: UNO_RULES_VERSION,
  rules: unoRules,
  configSchema,
  actionSchema,
  defaultConfig: () => ({ mode: "traditional", target: 500 }),
  setupFields: () => [
    {
      key: "mode",
      label: "Scoring model",
      type: "select",
      group: "variant",
      status: "official",
      options: [
        { value: "traditional", label: "Traditional: winner collects" },
        { value: "lowest", label: "Alternative: lowest total wins" },
      ],
    },
    { key: "target", label: "Target score", type: "number", group: "house", status: "official", min: 50, max: 5000, step: 50, help: "Official target is 500." },
  ],
  validateSetup: () => [],
  init(players, config) {
    return { players, config, totals: Object.fromEntries(players.map((p) => [p.id, 0])), rounds: [], winnerIds: [], tied: false };
  },
  validate(state, action) {
    const issues: Issue[] = [];
    if (state.winnerIds.length) return [{ message: "The game is already decided. Undo a round to continue." }];
    const ids = state.players.map((p) => p.id);
    if (!ids.includes(action.winnerId)) return [{ message: "Pick the player who went out." }];
    const losers = ids.filter((i) => i !== action.winnerId);
    const seen = new Set<string>();
    for (const h of action.hands) {
      if (h.playerId === action.winnerId) issues.push({ message: "The winner has no cards to count." });
      else if (!losers.includes(h.playerId)) issues.push({ message: `Unknown player ${h.playerId}.` });
      if (seen.has(h.playerId)) issues.push({ message: `${nameOf(state.players, h.playerId)} was entered twice.` });
      seen.add(h.playerId);
      if (h.points < 0 || h.points > MAX_HAND) issues.push({ message: `${nameOf(state.players, h.playerId)}: points must be 0–${MAX_HAND}.` });
    }
    for (const l of losers) if (!seen.has(l)) issues.push({ message: `Missing hand for ${nameOf(state.players, l)}.` });
    if (!issues.length && sum(action.hands.map((h) => h.points)) === 0)
      issues.push({ message: "Every hand is worth 0. Check the counts.", severity: "warning" });
    return issues;
  },
  reduce(state, action) {
    const totals = { ...state.totals };
    const hands: Record<string, number> = {};
    const gained: Record<string, number> = {};
    for (const h of action.hands) hands[h.playerId] = h.points;
    if (state.config.mode === "traditional") {
      const g = sum(action.hands.map((h) => h.points));
      totals[action.winnerId] = totals[action.winnerId]! + g;
      gained[action.winnerId] = g;
    } else {
      for (const h of action.hands) {
        totals[h.playerId] = totals[h.playerId]! + h.points;
        gained[h.playerId] = h.points;
      }
    }
    const next: UnoState = {
      ...state,
      totals,
      rounds: [...state.rounds, { number: state.rounds.length + 1, winnerId: action.winnerId, hands, gained }],
    };
    return { ...next, ...decide(next) };
  },
  standings(state) {
    const low = state.config.mode === "lowest";
    const items = state.players.map((p) => ({ playerId: p.id, total: state.totals[p.id]!, won: state.winnerIds.includes(p.id) }));
    return rankBy(items, (a, b) => (a.won !== b.won ? (a.won ? -1 : 1) : low ? a.total - b.total : b.total - a.total)).map((r) => ({
      playerId: r.playerId,
      rank: r.rank,
      value: r.total,
      display: `${r.total}`,
      detail: `${Math.max(0, state.config.target - r.total)} to ${low ? "limit" : "target"}`,
    }));
  },
  outcome(state) {
    const low = state.config.mode === "lowest";
    if (state.winnerIds.length)
      return {
        finished: true,
        winnerIds: state.winnerIds,
        reason: low
          ? `${nameOf(state.players, state.winnerIds[0]!)} has the lowest total after someone reached ${state.config.target}.`
          : `${nameOf(state.players, state.winnerIds[0]!)} reached ${state.config.target} with the highest score.`,
      };
    if (state.tied) return { finished: false, winnerIds: [], reason: "Tied at the top. Play another hand to break the tie.", tiebreak: "Tie handling is an app decision." };
    return { finished: false, winnerIds: [], reason: low ? `Game ends when someone reaches ${state.config.target}; lowest total wins.` : `First to ${state.config.target} wins.` };
  },
  progressLabel: (s) => `Round ${s.rounds.length + 1}`,
  history(state) {
    return {
      columns: state.players.map((p) => ({ id: p.id, label: p.name })),
      rows: state.rounds.map((r) => ({
        label: `Round ${r.number}`,
        cells: Object.fromEntries(state.players.map((p) => [p.id, p.id === r.winnerId ? `OUT${r.gained[p.id] !== undefined ? ` +${r.gained[p.id]}` : ""}` : r.gained[p.id] !== undefined ? `+${r.gained[p.id]}` : "–"])),
      })),
    };
  },
  describeAction: (s, a) => `Round ${s.rounds.length + 1}: ${nameOf(s.players, a.winnerId)} went out`,
};
