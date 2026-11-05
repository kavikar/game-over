import { getGame } from "./registry";
import { replay } from "./session";
import type { Session } from "./types";

export const MIN_SAMPLE = 3;

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  /** null when there are too few games to be meaningful. */
  winRate: number | null;
  perGame: Record<string, { played: number; wins: number; avgValue: number | null; best: number | null }>;
}

/** Derive stats only from completed sessions, using each game's own standings/outcome. */
export function computeStats(sessions: Session[]): Map<string, PlayerStats> {
  const out = new Map<string, PlayerStats>();
  const sums: Record<string, Record<string, number[]>> = {};
  const get = (id: string): PlayerStats => {
    let s = out.get(id);
    if (!s) {
      s = { playerId: id, gamesPlayed: 0, wins: 0, winRate: null, perGame: {} };
      out.set(id, s);
    }
    return s;
  };
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const mod = getGame(session.gameId);
    if (!mod) continue;
    const { state, error } = replay(mod, session);
    if (error) continue;
    const outcome = mod.outcome(state);
    const standings = mod.standings(state);
    for (const p of session.players) {
      const s = get(p.id);
      const won = outcome.winnerIds.includes(p.id);
      s.gamesPlayed += 1;
      if (won) s.wins += 1;
      const g = (s.perGame[session.gameId] ??= { played: 0, wins: 0, avgValue: null, best: null });
      g.played += 1;
      if (won) g.wins += 1;
      const st = standings.find((x) => x.playerId === p.id);
      if (st) ((sums[p.id] ??= {})[session.gameId] ??= []).push(st.value);
    }
  }
  for (const s of out.values()) {
    s.winRate = s.gamesPlayed >= MIN_SAMPLE ? s.wins / s.gamesPlayed : null;
    for (const [gid, g] of Object.entries(s.perGame)) {
      const vals = sums[s.playerId]?.[gid] ?? [];
      if (g.played >= MIN_SAMPLE && vals.length) g.avgValue = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (vals.length) g.best = Math.max(...vals);
    }
  }
  return out;
}

/** Head-to-head: wins when both played the same completed session. */
export function headToHead(sessions: Session[], a: string, b: string) {
  let aWins = 0, bWins = 0, together = 0;
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    if (!session.players.some((p) => p.id === a) || !session.players.some((p) => p.id === b)) continue;
    const mod = getGame(session.gameId);
    if (!mod) continue;
    const { state, error } = replay(mod, session);
    if (error) continue;
    const w = mod.outcome(state).winnerIds;
    together += 1;
    if (w.includes(a) && !w.includes(b)) aWins += 1;
    if (w.includes(b) && !w.includes(a)) bWins += 1;
  }
  return { together, aWins, bWins };
}
