import type { RulesDoc } from "@/engine/types";

export const UNO_RULES_VERSION = "uno-2026.1";

export const unoRules: RulesDoc = {
  rulesVersion: UNO_RULES_VERSION,
  sources: [
    {
      publisher: "Mattel",
      edition: "UNO (classic deck)",
      sourceUrl: "https://service.mattel.com/instruction_sheets/42885-0920_Uno_30th_Instr.pdf",
      sourceType: "publisher",
      lastVerified: null,
      verification: "partial",
      note:
        "Found via search; the PDF itself could not be opened from the build environment. Scoring values and 500-point target agree across search summaries of this sheet.",
    },
  ],
  objective: "Go out first each hand. Points are scored by hand; the first player to reach the target score wins (traditional).",
  players: "2–10 players.",
  components: ["UNO deck", "Score sheet (this app)"],
  sections: [
    {
      heading: "Card values",
      body: ["Number cards count their face value (0–9).", "Draw Two, Reverse and Skip are 20 points each.", "Wild and Wild Draw Four are 50 points each."],
      status: "official",
    },
    {
      heading: "Traditional scoring",
      body: [
        "When a player goes out, they score the total value of every card left in the other players' hands.",
        "Play hands until one player reaches 500 points. That player wins.",
      ],
      status: "official",
    },
    {
      heading: "Alternative scoring (lowest wins)",
      body: [
        "Each player keeps a running total of the points left in their own hand each round. When one player reaches the target, the player with the lowest total wins.",
        "Mattel's sheet describes this alternative. Search summaries agree, but it is marked as an interpretation here.",
      ],
      status: "interpretation",
    },
    {
      heading: "Ties",
      body: [
        "If two players are tied on the highest score at or above the target, the app keeps the game open so you can play another hand.",
        "This tie handling is an app decision. No tie procedure was found in the sources.",
      ],
      status: "interpretation",
    },
  ],
  faq: [
    { q: "Does stacking Draw Two count?", a: "Stacking is not part of the standard rules. It does not change scoring, so the app ignores it.", status: "house" },
    { q: "What about special cards in newer decks?", a: "Cards like Wild Shuffle Hands are not modelled. Enter their points in the manual box.", status: "interpretation" },
  ],
  editions: [{ id: "classic", name: "Classic", note: "Supported." }],
  houseRules: [
    { id: "target", name: "Custom target score", description: "Play to 200, 300, 500 or any number." },
    { id: "mode", name: "Lowest wins", description: "Everyone adds their own hand points. Lowest total wins when someone hits the target." },
  ],
};
