import type { RulesDoc } from "@/engine/types";

export const POKER_RULES_VERSION = "poker-bank-2026.1";

export const pokerRules: RulesDoc = {
  rulesVersion: POKER_RULES_VERSION,
  sources: [
    {
      publisher: "GameNight (original)",
      edition: "Chip and bankroll tracker",
      sourceUrl: "https://github.com/kavikar/game-over",
      sourceType: "community",
      lastVerified: null,
      verification: "verified",
      note: "This module tracks money and chips only. It does not deal, rank hands or enforce any poker variant's rules, so there is no publisher rulebook to verify against.",
    },
  ],
  objective: "Track buy-ins, rebuys and cash-outs for a home game, then settle who is up or down.",
  players: "2–10 players.",
  components: ["Your own chips and cards"],
  sections: [
    { heading: "Cash game", body: ["Everyone buys in for a fixed amount and receives chips. You may rebuy. When you leave, you cash out your chips at the chip value.", "Net = cash-out value − total bought in. Results are ranked by net."], status: "interpretation" },
    { heading: "Tournament", body: ["Everyone buys in once (rebuys optional). When a player busts, record it. The last player standing wins.", "The prize pool is all buy-ins. Payouts are split by the percentages you choose."], status: "interpretation" },
    { heading: "Chip check", body: ["Total chips cashed out should equal total chips bought. If not, the app warns you before you confirm."], status: "interpretation" },
    { heading: "Money", body: ["All amounts are stored as whole cents to avoid rounding errors."], status: "interpretation" },
  ],
  faq: [{ q: "Is this for real-money gambling?", a: "It is a bookkeeping tool for friendly games. Check your local laws.", status: "interpretation" }],
  editions: [{ id: "cash", name: "Cash game", note: "Supported." }, { id: "tournament", name: "Tournament", note: "Supported." }],
  houseRules: [{ id: "rebuys", name: "Rebuys", description: "Allow players to buy back in." }],
};
