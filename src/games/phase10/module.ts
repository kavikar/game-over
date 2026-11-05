import { z } from "zod";
import type { GameModule, HistoryRow, Issue, PlayerRef, Standing } from "@/engine/types";
import { nameOf, rankBy, sum } from "@/engine/util";
import { HARD_MAX, POINT_STEP, WARN_ABOVE } from "./scoring";
import { PHASES } from "./phases";
import { phase10Rules, PHASE10_RULES_VERSION } from "./rules";

export const configSchema = z.object({
  edition: z.enum(["classic"]).default("classic"),
  strictFives: z.boolean().default(true),
});
export type Phase10Config = z.infer<typeof configSchema>;

export const actionSchema = z.object({
  type: z.literal("round"),
  /** The player who went out (emptied their hand). */
  wentOutId: z.string().min(1),
  results: z
    .array(
      z.object({
        playerId: z.string().min(1),
        completed: z.boolean(),
        points: z.number().int(),
      }),
    )
    .min(2),
});
export type Phase10Action = z.infer<typeof actionSchema>;

export interface Phase10Round {
  number: number;
  wentOutId: string;
  results: Record<string, { completed: boolean; points: number; phaseBefore: number }>;
}

export interface Phase10State {
  players: PlayerRef[];
  config: Phase10Config;
  /** Phase each player is currently attempting (1–10). */
  phase: Record<string, number>;
  totals: Record<string, number>;
  /** Players who have completed Phase 10 at least once. */
  finishedPhase10: Record<string, boolean>;
  rounds: Phase10Round[];
  /** If set, only these players can still win (they tied for the lowest score). */
  contenders: string[] | null;
  winnerIds: string[];
}

export const phase10: GameModule<Phase10Config, Phase10State, Phase10Action> = {
  meta: {
    id: "phase10",
    name: "Phase 10",
    tagline: "Ten goals. One hand at a time.",
    description:
      "A rummy-style card game where each player works through ten phases of sets, runs and colors. Players advance independently; the cards you are stuck with cost you points.",
    categories: ["Card Games", "Family Games"],
    minPlayers: 2,
    maxPlayers: 6,
    duration: [45, 90],
    scoringType: "Round penalties + independent phase progression",
    editions: ["Classic"],
    cover: { bg: "#203B32", fg: "#F5F0E6", accent: "#B49A67", motif: "phases" },
    featured: true,
  },
  rulesVersion: PHASE10_RULES_VERSION,
  rules: phase10Rules,

  configSchema,
  actionSchema,
  defaultConfig: () => ({ edition: "classic", strictFives: true }),
  setupFields: () => [
    {
      key: "edition",
      label: "Edition",
      type: "select",
      group: "variant",
      status: "official",
      options: [{ value: "classic", label: "Classic (10 phases)" }],
      help: "Other editions (Twist, Masters, Dice) use different rules and are not supported yet.",
    },
    {
      key: "strictFives",
      label: "Require hand totals in multiples of 5",
      type: "toggle",
      group: "house",
      status: "interpretation",
      help: "Every Phase 10 card is worth a multiple of 5, so other totals are probably typos. Turn off for custom decks.",
    },
  ],
  validateSetup: (players) => (players.length < 2 ? [{ message: "Phase 10 needs at least 2 players." }] : []),

  init(players, config) {
    const phase: Record<string, number> = {};
    const totals: Record<string, number> = {};
    const finishedPhase10: Record<string, boolean> = {};
    for (const p of players) {
      phase[p.id] = 1;
      totals[p.id] = 0;
      finishedPhase10[p.id] = false;
    }
    return { players, config, phase, totals, finishedPhase10, rounds: [], contenders: null, winnerIds: [] };
  },

  validate(state, action) {
    const issues: Issue[] = [];
    if (state.winnerIds.length) return [{ message: "The game is already decided. Undo a round to continue." }];
    const ids = state.players.map((p) => p.id);
    const seen = new Set<string>();
    for (const r of action.results) {
      if (!ids.includes(r.playerId)) issues.push({ message: `Unknown player ${r.playerId}.` });
      if (seen.has(r.playerId)) issues.push({ message: `${nameOf(state.players, r.playerId)} was entered twice.` });
      seen.add(r.playerId);
    }
    for (const id of ids) if (!seen.has(id)) issues.push({ message: `Missing result for ${nameOf(state.players, id)}.` });
    if (issues.length) return issues;

    const out = action.results.find((r) => r.playerId === action.wentOutId);
    if (!out) return [{ message: "The player who went out must be one of the players." }];
    if (!out.completed) issues.push({ message: `${nameOf(state.players, out.playerId)} went out, so they must have completed their phase.` });
    if (out.points !== 0) issues.push({ message: `${nameOf(state.players, out.playerId)} went out, so they have 0 card points.` });
    for (const r of action.results) {
      const who = nameOf(state.players, r.playerId);
      if (r.points < 0) issues.push({ message: `${who}: points cannot be negative.` });
      if (r.points > HARD_MAX) issues.push({ message: `${who}: ${r.points} points is not possible in one hand.` });
      if (r.playerId !== action.wentOutId && r.points === 0)
        issues.push({ message: `${who} still held cards, so their points must be at least ${POINT_STEP}.` });
      if (state.config.strictFives && r.points % POINT_STEP !== 0)
        issues.push({ message: `${who}: card totals are multiples of ${POINT_STEP}.` });
      if (r.points > WARN_ABOVE && r.points <= HARD_MAX)
        issues.push({ message: `${who}: ${r.points} points is unusually high. Check the count.`, severity: "warning" });
    }
    return issues;
  },

  reduce(state, action) {
    const phase = { ...state.phase };
    const totals = { ...state.totals };
    const finished = { ...state.finishedPhase10 };
    const results: Phase10Round["results"] = {};
    const finishersThisRound: string[] = [];
    for (const r of action.results) {
      results[r.playerId] = { completed: r.completed, points: r.points, phaseBefore: phase[r.playerId]! };
      totals[r.playerId] = (totals[r.playerId] ?? 0) + r.points;
      if (r.completed) {
        if (phase[r.playerId]! < 10) phase[r.playerId] = phase[r.playerId]! + 1;
        else {
          finished[r.playerId] = true;
          finishersThisRound.push(r.playerId);
        }
      }
    }
    const round: Phase10Round = { number: state.rounds.length + 1, wentOutId: action.wentOutId, results };

    // Winner determination: players who complete Phase 10 in this hand compete on lowest total.
    const eligible = state.contenders ? finishersThisRound.filter((id) => state.contenders!.includes(id)) : finishersThisRound;
    let winnerIds: string[] = [];
    let contenders = state.contenders;
    if (eligible.length) {
      const low = Math.min(...eligible.map((id) => totals[id]!));
      const best = eligible.filter((id) => totals[id] === low);
      if (best.length === 1) winnerIds = best;
      else contenders = best; // tie: tied players play another hand
    }
    return { ...state, phase, totals, finishedPhase10: finished, rounds: [...state.rounds, round], contenders, winnerIds };
  },

  standings(state): Standing[] {
    const items = state.players.map((p) => ({
      playerId: p.id,
      phase: state.phase[p.id]!,
      total: state.totals[p.id]!,
      won: state.winnerIds.includes(p.id),
      done: state.finishedPhase10[p.id]!,
    }));
    const ranked = rankBy(items, (a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      if (a.done !== b.done) return a.done ? -1 : 1;
      if (a.phase !== b.phase) return b.phase - a.phase;
      return a.total - b.total;
    });
    return ranked.map((r) => ({
      playerId: r.playerId,
      rank: r.rank,
      value: r.total,
      display: `${r.total}`,
      detail: r.done ? "Completed Phase 10" : `Phase ${r.phase}`,
    }));
  },

  outcome(state) {
    if (state.winnerIds.length) {
      const names = state.winnerIds.map((id) => nameOf(state.players, id)).join(", ");
      const finishers = state.players.filter((p) => state.finishedPhase10[p.id]);
      return {
        finished: true,
        winnerIds: state.winnerIds,
        reason:
          finishers.length > 1
            ? `${names} completed Phase 10 with the lowest score among players who finished it.`
            : `${names} was first to complete Phase 10.`,
        tiebreak: state.rounds.length && state.contenders ? "Decided in a tiebreak hand." : undefined,
      };
    }
    if (state.contenders)
      return {
        finished: false,
        winnerIds: [],
        reason: `Tied on the lowest score: ${state.contenders.map((id) => nameOf(state.players, id)).join(", ")}. Play another hand.`,
        tiebreak: "Tie replay procedure is unverified. See rules.",
      };
    return { finished: false, winnerIds: [], reason: "First to complete Phase 10 wins. Lowest score breaks ties." };
  },

  progressLabel: (s) => `Hand ${s.rounds.length + 1}`,

  history(state) {
    const rows: HistoryRow[] = state.rounds.map((r) => ({
      label: `Hand ${r.number}`,
      cells: Object.fromEntries(
        state.players.map((p) => {
          const x = r.results[p.id]!;
          const out = r.wentOutId === p.id ? " · out" : "";
          return [p.id, `P${x.phaseBefore} ${x.completed ? "✓" : "✗"} +${x.points}${out}`];
        }),
      ),
    }));
    return { columns: state.players.map((p) => ({ id: p.id, label: p.name })), rows };
  },

  describeAction(state, a) {
    const total = sum(a.results.map((r) => r.points));
    return `Hand ${state.rounds.length + 1}: ${nameOf(state.players, a.wentOutId)} went out (${total} pts left in other hands)`;
  },
};

export { PHASES };
