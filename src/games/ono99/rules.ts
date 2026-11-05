import type { RulesDoc } from "@/engine/types";

export const ONO99_RULES_VERSION = "ono99-2026.1";

export const ono99Rules: RulesDoc = {
  rulesVersion: ONO99_RULES_VERSION,
  sources: [
    {
      publisher: "Mattel",
      edition: "ONO 99 (2022 edition)",
      sourceUrl: "https://mattel.co.jp/wp-content/uploads/2022/07/ONO99.pdf",
      sourceType: "publisher",
      lastVerified: null,
      verification: "unverified",
      note:
        "The only Mattel document found is a Japanese-language PDF, and it could not be opened here. Search summaries agree on the 99 limit, Reverse and Play 2, and that totals cannot go negative, but disagree on tokens/lives and on the ONO 99 card. Treat every default below as UNVERIFIED and change it to match your rule sheet.",
    },
  ],
  objective: "Add and subtract cards on a shared running total without pushing it past 99. Players who cannot play lose a life. Last player alive wins.",
  players: "2–6 players.",
  components: ["ONO 99 deck", "Lives tracker (this app)"],
  sections: [
    {
      heading: "The pile",
      body: ["Play one card per turn and call out the new total. The total starts at 0 each round and may never exceed 99."],
      status: "interpretation",
    },
    {
      heading: "Cards modelled by the app",
      body: [
        "Number cards 0–9: add the face value.",
        "−10: subtract 10. Not playable if it would make the total negative (newer-rules summaries).",
        "Reverse: flip the direction of play.",
        "Play 2: the next player takes two turns in a row. The app does not model stacking or passing a Play 2.",
        "ONO 99: sets the total to 99 (the 'ONO 99' card). Sources disagree on its exact behavior.",
        "Skip: off by default; turn it on if your deck has it.",
      ],
      status: "unverified",
    },
    {
      heading: "Losing a life",
      body: [
        "If it is your turn and no card in your hand can be played without going over 99, you lose a life. The total resets to 0 and a new round starts with the next player.",
        "Starting lives default to 3. Sources disagree, so this is configurable and unverified.",
      ],
      status: "unverified",
    },
    { heading: "Winning", body: ["When only one player still has a life, that player wins."], status: "interpretation" },
  ],
  faq: [
    { q: "Does the app know my hand?", a: "No. You tell it which card was played. It checks that the move is legal for the pile and whose turn it is.", status: "interpretation" },
    { q: "What if the rule sheet says something different?", a: "Change lives and card options in setup, or end the game manually.", status: "house" },
  ],
  editions: [
    { id: "2022", name: "2022 Mattel edition", note: "Partially modelled; rules unverified." },
    { id: "1980", name: "O'NO 99 (1980)", note: "Used a points variant. Not supported." },
  ],
  houseRules: [
    { id: "startingLives", name: "Starting lives", description: "Change how many lives each player starts with." },
    { id: "skipCard", name: "Skip card", description: "Enable if your deck includes a Skip." },
  ],
};
