import { z } from "zod";
import type { GameModule, Issue, PlayerRef } from "@/engine/types";
import { nameOf, rankBy } from "@/engine/util";
import { EDITIONS, scoreEntry, type EditionId } from "./scoring";
import { TTR_RULES_VERSION, ttrRules } from "./rules";

export const configSchema = z.object({ edition: z.enum(["usa", "europe"]).default("usa") });
export type TtrConfig = z.infer<typeof configSchema>;

const entrySchema = z.object({
  playerId: z.string().min(1),
  /** Number of claimed routes by length, e.g. {"3": 2, "6": 1}. */
  routes: z.record(z.string(), z.number().int().min(0).max(60)),
  ticketsCompleted: z.number().int().min(0).max(300),
  ticketsFailed: z.number().int().min(0).max(300),
  /** Count of tickets completed, only used for tie-breaking. */
  ticketCount: z.number().int().min(0).max(40).default(0),
  stationsUnused: z.number().int().min(0).max(3).default(0),
  longestPath: z.boolean().default(false),
});
export const actionSchema = z.object({ type: z.literal("final"), entries: z.array(entrySchema).min(2) });
export type TtrAction = z.infer<typeof actionSchema>;
export type TtrEntry = z.infer<typeof entrySchema>;

export interface TtrState {
  players: PlayerRef[];
  config: TtrConfig;
  entries: Record<string, TtrEntry> | null;
  scores: Record<string, ReturnType<typeof scoreEntry>> | null;
  winnerIds: string[];
  tiebreak?: string;
}

function decide(s: TtrState, scores: NonNullable<TtrState["scores"]>, entries: NonNullable<TtrState["entries"]>) {
  const best = Math.max(...s.players.map((p) => scores[p.id]!.total));
  let w = s.players.filter((p) => scores[p.id]!.total === best).map((p) => p.id);
  let tiebreak: string | undefined;
  if (w.length > 1) {
    const ed = EDITIONS[s.config.edition];
    if (ed.tiebreak === "longest") {
      const lp = w.filter((id) => entries[id]!.longestPath);
      if (lp.length >= 1 && lp.length < w.length) { w = lp; tiebreak = "Tie broken by Longest Continuous Path."; }
    } else {
      const most = Math.max(...w.map((id) => entries[id]!.ticketCount));
      const m = w.filter((id) => entries[id]!.ticketCount === most);
      if (m.length < w.length) { w = m; tiebreak = "Tie broken by most completed tickets."; }
      if (w.length > 1) {
        const lp = w.filter((id) => entries[id]!.longestPath);
        if (lp.length >= 1 && lp.length < w.length) { w = lp; tiebreak = "Tie broken by tickets, then Longest Continuous Path."; }
      }
    }
    if (w.length > 1) tiebreak = "Still tied after tiebreakers: shared win.";
  }
  return { winnerIds: w, tiebreak };
}

export const ticketToRide: GameModule<TtrConfig, TtrState, TtrAction> = {
  meta: {
    id: "ticket-to-ride",
    name: "Ticket to Ride",
    tagline: "Every route tells a story.",
    description: "Claim railway routes, connect cities for destination tickets, and tally everything at the end.",
    categories: ["Board Games", "Strategy Games", "Family Games"],
    minPlayers: 2,
    maxPlayers: 5,
    duration: [45, 75],
    scoringType: "Component-based final tally",
    editions: ["USA", "Europe"],
    cover: { bg: "#E8DFCE", fg: "#203B32", accent: "#C87554", motif: "routes" },
    featured: true,
  },
  rulesVersion: TTR_RULES_VERSION,
  rules: ttrRules,
  configSchema,
  actionSchema,
  defaultConfig: () => ({ edition: "usa" }),
  setupFields: () => [
    {
      key: "edition",
      label: "Edition",
      type: "select",
      group: "variant",
      status: "official",
      options: Object.values(EDITIONS).map((e) => ({ value: e.id, label: e.name })),
      help: "Route values, stations and the longest-path bonus follow the edition.",
    },
  ],
  validateSetup: () => [],
  init: (players, config) => ({ players, config, entries: null, scores: null, winnerIds: [] }),
  validate(state, action) {
    if (state.entries) return [{ message: "Final scores are entered. Undo to change them." }];
    const issues: Issue[] = [];
    const ed = EDITIONS[state.config.edition as EditionId];
    const ids = state.players.map((p) => p.id);
    const seen = new Set(action.entries.map((e) => e.playerId));
    for (const id of ids) if (!seen.has(id)) issues.push({ message: `Missing scores for ${nameOf(state.players, id)}.` });
    if (seen.size !== action.entries.length) issues.push({ message: "A player was entered twice." });
    for (const e of action.entries) {
      const who = nameOf(state.players, e.playerId);
      if (!ids.includes(e.playerId)) issues.push({ message: `Unknown player ${e.playerId}.` });
      for (const k of Object.keys(e.routes)) if (!(k in ed.routeTable)) issues.push({ message: `${who}: ${ed.name} has no routes of length ${k}.` });
      if (e.stationsUnused > 0 && !ed.stations) issues.push({ message: `${who}: ${ed.name} has no stations.` });
      if (e.ticketCount > 0 && e.ticketsCompleted === 0) issues.push({ message: `${who}: tickets completed but 0 ticket points.`, severity: "warning" });
    }
    const lp = action.entries.filter((e) => e.longestPath).length;
    if (lp === 0) issues.push({ message: "No one has the longest path. That is allowed only if no one scored it.", severity: "warning" });
    return issues;
  },
  reduce(state, action) {
    const entries = Object.fromEntries(action.entries.map((e) => [e.playerId, e]));
    const scores = Object.fromEntries(action.entries.map((e) => [e.playerId, scoreEntry(state.config.edition, e)]));
    const next = { ...state, entries, scores };
    return { ...next, ...decide(next, scores, entries) };
  },
  standings(state) {
    const items = state.players.map((p) => ({ playerId: p.id, total: state.scores?.[p.id]?.total ?? 0, win: state.winnerIds.includes(p.id) }));
    return rankBy(items, (a, b) => (a.win !== b.win ? (a.win ? -1 : 1) : b.total - a.total)).map((r) => {
      const sc = state.scores?.[r.playerId];
      return {
        playerId: r.playerId,
        rank: r.rank,
        value: r.total,
        display: `${r.total}`,
        detail: sc ? `Routes ${sc.routes} · Tickets +${sc.ticketsCompleted}/−${sc.ticketsFailed}${sc.stations ? ` · Stations +${sc.stations}` : ""}${sc.longest ? ` · Longest +${sc.longest}` : ""}` : undefined,
      };
    });
  },
  outcome(state) {
    if (!state.scores) return { finished: false, winnerIds: [], reason: "Enter every player's final scoring components." };
    return {
      finished: true,
      winnerIds: state.winnerIds,
      reason: `${state.winnerIds.map((id) => nameOf(state.players, id)).join(" & ")} scored the most points.`,
      tiebreak: state.tiebreak,
    };
  },
  progressLabel: (s) => (s.scores ? "Final scoring" : "Awaiting final scoring"),
  history(state) {
    const sc = state.scores;
    if (!sc) return { columns: [], rows: [] };
    const row = (label: string, f: (id: string) => number) => ({ label, cells: Object.fromEntries(state.players.map((p) => [p.id, `${f(p.id)}`])) });
    return {
      columns: state.players.map((p) => ({ id: p.id, label: p.name })),
      rows: [
        row("Routes", (i) => sc[i]!.routes),
        row("Tickets completed", (i) => sc[i]!.ticketsCompleted),
        row("Tickets failed", (i) => -sc[i]!.ticketsFailed),
        ...(EDITIONS[state.config.edition].stations ? [row("Unused stations", (i) => sc[i]!.stations)] : []),
        row("Longest path", (i) => sc[i]!.longest),
        row("Total", (i) => sc[i]!.total),
      ],
    };
  },
  describeAction: () => "Final scoring entered",
};
