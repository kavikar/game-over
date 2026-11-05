import type { RulesDoc } from "@/engine/types";

export const TTR_RULES_VERSION = "ttr-2026.1";

export const ttrRules: RulesDoc = {
  rulesVersion: TTR_RULES_VERSION,
  sources: [
    {
      publisher: "Days of Wonder",
      edition: "Ticket to Ride (USA) and Europe",
      sourceUrl: "https://www.daysofwonder.com/tickettoride/en/usa/",
      sourceType: "publisher",
      lastVerified: null,
      verification: "partial",
      note:
        "Search confirmed: destination tickets subtract when incomplete, 10-point Longest Continuous Path (shared if tied). The route-length table and Europe station values come from memory of the published rulebooks and could not be checked online here. Verify against your rulebook.",
    },
  ],
  objective: "Score the most points from claimed routes, completed destination tickets and bonuses, minus failed tickets.",
  players: "2–5 players.",
  components: ["Train cards and train pieces", "Destination tickets", "Board", "Score sheet (this app)"],
  sections: [
    {
      heading: "Scoring components",
      body: [
        "Routes: points per claimed route by length (USA: 1, 2, 4, 7, 10, 15 for lengths 1–6). Europe adds length 8 = 21 and has no length 5.",
        "Destination tickets: add the ticket value if you connected the cities, subtract it if you did not.",
        "Longest Continuous Path: 10 points. If tied, every tied player gets it.",
        "Europe stations: 4 points for each station you did not use.",
      ],
      status: "official",
    },
    {
      heading: "Winning",
      body: ["Highest total wins."],
      status: "official",
    },
    {
      heading: "Tiebreakers",
      body: [
        "USA: the tied player with the Longest Continuous Path wins.",
        "Europe: the tied player with the most completed tickets wins; then the Longest Path.",
        "These tiebreakers are the commonly published ones and are marked unverified. If still tied, the app shows a shared win.",
      ],
      status: "unverified",
    },
    {
      heading: "How this app scores",
      body: [
        "You enter route counts by length, plus ticket totals, per player. Route points are calculated from the edition table.",
        "Other editions (1910, Nordic Countries, etc.) have different bonuses and are not supported yet.",
      ],
      status: "interpretation",
    },
  ],
  faq: [
    { q: "Do I enter points or counts?", a: "Route counts. The app multiplies them by the edition table.", status: "interpretation" },
  ],
  editions: [
    { id: "usa", name: "USA (classic)", note: "Supported." },
    { id: "europe", name: "Europe", note: "Supported, with stations." },
    { id: "1910", name: "USA 1910 expansion", note: "Uses a Globetrotter bonus. Not supported yet." },
  ],
  houseRules: [],
};
