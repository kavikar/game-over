import type { Standing } from "./types";

/** Competition ranking (1,2,2,4). `better(a,b)` < 0 means a ranks above b. */
export function rankBy<T extends { playerId: string }>(
  items: T[],
  compare: (a: T, b: T) => number,
): (T & { rank: number })[] {
  const sorted = [...items].sort(compare);
  const out: (T & { rank: number })[] = [];
  sorted.forEach((it, i) => {
    const prev = out[i - 1];
    const rank = prev && compare(sorted[i - 1]!, it) === 0 ? prev.rank : i + 1;
    out.push({ ...it, rank });
  });
  return out;
}

export function nameOf(players: { id: string; name: string }[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

export function sortStandings(s: Standing[]): Standing[] {
  return [...s].sort((a, b) => a.rank - b.rank);
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
