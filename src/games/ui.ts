import type { GameUI } from "@/components/play/game-ui";
import { phase10UI } from "./phase10/ui";
import { unoUI } from "./uno/ui";
import { ttrUI } from "./ticket-to-ride/ui";
import { ono99UI } from "./ono99/ui";
import { pokerUI } from "./poker/ui";

/**
 * UI plug-in registry: game id -> its React pieces. Games without an entry get the generic board
 * and cannot be scored in the app, so every registered game must have one.
 */
export const gameUIs: Record<string, GameUI> = {
  phase10: phase10UI,
  uno: unoUI,
  "ticket-to-ride": ttrUI,
  ono99: ono99UI,
  poker: pokerUI,
};
