/**
 * Ticket to Ride scoring tables per edition. Independent module: no other game imports this.
 * Route-length tables are the commonly published values. Verification: partial (see rules.ts).
 */
export type EditionId = "usa" | "europe";

export interface Edition {
  id: EditionId;
  name: string;
  /** route length -> points */
  routeTable: Record<string, number>;
  longestBonus: number;
  /** Points per unused station (null = edition has no stations). */
  stations: number | null;
  tiebreak: "longest" | "tickets";
}

export const EDITIONS: Record<EditionId, Edition> = {
  usa: { id: "usa", name: "USA (classic)", routeTable: { "1": 1, "2": 2, "3": 4, "4": 7, "5": 10, "6": 15 }, longestBonus: 10, stations: null, tiebreak: "longest" },
  europe: { id: "europe", name: "Europe", routeTable: { "1": 1, "2": 2, "3": 4, "4": 7, "6": 15, "8": 21 }, longestBonus: 10, stations: 4, tiebreak: "tickets" },
};

export interface ScoreInput {
  routes: Record<string, number>;
  ticketsCompleted: number;
  ticketsFailed: number;
  stationsUnused?: number;
  longestPath?: boolean;
}

export function scoreEntry(editionId: EditionId, e: ScoreInput) {
  const ed = EDITIONS[editionId];
  let routes = 0;
  for (const [len, n] of Object.entries(e.routes)) {
    const pts = ed.routeTable[len];
    if (pts === undefined) throw new RangeError(`No routes of length ${len} in ${ed.name}`);
    routes += pts * n;
  }
  const stations = ed.stations === null ? 0 : (e.stationsUnused ?? 0) * ed.stations;
  const longest = e.longestPath ? ed.longestBonus : 0;
  return {
    routes,
    ticketsCompleted: e.ticketsCompleted,
    ticketsFailed: e.ticketsFailed,
    stations,
    longest,
    total: routes + e.ticketsCompleted - e.ticketsFailed + stations + longest,
  };
}
