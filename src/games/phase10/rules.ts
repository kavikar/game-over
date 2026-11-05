import type { RulesDoc } from "@/engine/types";

export const PHASE10_RULES_VERSION = "p10-classic-2026.1";

export const phase10Rules: RulesDoc = {
  rulesVersion: PHASE10_RULES_VERSION,
  sources: [
    {
      publisher: "Mattel",
      edition: "Phase 10 (classic card game)",
      sourceUrl: "https://shop.mattel.com/",
      sourceType: "publisher",
      lastVerified: null,
      verification: "unverified",
      note:
        "The Mattel instruction host could not be reached from the build environment. Rules below match several secondary summaries found by search, not the printed rule card. Check the card in your box and report differences.",
    },
    {
      publisher: "Community summaries",
      edition: "Classic",
      sourceUrl: "https://www.unorules.com/phase-10-rules",
      sourceType: "secondary",
      lastVerified: null,
      verification: "partial",
      note: "Cross-reference only. Not authoritative.",
    },
  ],
  objective:
    "Be the first player to complete all ten phases. If more than one player completes Phase 10 in the same hand, the lowest total score wins.",
  players: "2–6 players. Specialty Phase 10 deck.",
  components: ["Phase 10 deck: number cards 1–12 in four colors, Wild cards, Skip cards", "Score sheet (this app)"],
  sections: [
    {
      heading: "A hand",
      body: [
        "Each player gets 10 cards. On your turn, draw, then discard.",
        "Once you have completed your current phase, you may lay it down. After that you may add cards to laid-down groups.",
        "A hand ends when one player goes out by getting rid of every card.",
      ],
      status: "official",
    },
    {
      heading: "Independent progression",
      body: [
        "Each player has their own current phase. If you completed your phase this hand, you move to the next phase.",
        "If you did not complete it, you try the same phase again next hand.",
        "Players going out does not move other players forward.",
      ],
      status: "official",
    },
    {
      heading: "Scoring",
      body: [
        "After a hand, every player except the one who went out counts the cards left in their hand.",
        "Cards 1–9 are 5 points each. Cards 10–12 are 10 points each. Skip is 15. Wild is 25.",
        "The player who went out scores 0. Scores accumulate across hands. Lower is better.",
      ],
      status: "official",
    },
    {
      heading: "How this app records a hand",
      body: [
        "You enter, for each player, whether they completed their phase and the points left in their hand.",
        "The app requires exactly one player who went out. That player must have completed their phase and has 0 points.",
        "Anyone else must have at least 5 points, because they still held cards.",
      ],
      status: "interpretation",
    },
    {
      heading: "Winning",
      body: [
        "The game ends in the hand where a player completes Phase 10.",
        "If several players complete Phase 10 in the same hand, the lowest cumulative score wins.",
      ],
      status: "official",
    },
    {
      heading: "Ties",
      body: [
        "If the lowest score is tied, the app asks the tied players to play another hand. Whoever completes Phase 10 with the lowest total wins.",
        "Sources disagree on the exact tie procedure, so this is marked unverified. Use the house rule you agree on and end the game manually if needed.",
      ],
      status: "unverified",
    },
  ],
  faq: [
    {
      q: "Does going out require completing my phase?",
      a: "Yes. You can only go out after laying down your phase.",
      status: "official",
    },
    {
      q: "Can I finish Phase 10 without going out?",
      a: "In the app, yes: a player completes a phase when they lay it down, even if someone else goes out. Enter completed = yes with the cards left in hand.",
      status: "interpretation",
    },
    {
      q: "Do Skip cards affect the app?",
      a: "Only through penalty points. A skipped player is not tracked.",
      status: "interpretation",
    },
  ],
  editions: [
    { id: "classic", name: "Classic", note: "Supported. Ten phases listed on the game page." },
    { id: "twist", name: "Phase 10 Twist", note: "Different phases and cards. Not yet supported." },
    { id: "dice", name: "Phase 10 Dice", note: "Different game, scoring highest total wins. Not supported." },
  ],
  houseRules: [
    { id: "strictFives", name: "Strict multiples of 5", description: "Rejects hand totals that cannot be formed from official card values." },
  ],
};
