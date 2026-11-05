import { registerGame } from "@/engine/registry";
import { phase10 } from "./phase10/module";
import { uno } from "./uno/module";
import { ticketToRide } from "./ticket-to-ride/module";
import { ono99 } from "./ono99/module";
import { poker } from "./poker/module";

/**
 * The single place games are plugged in. Adding a game = implement GameModule,
 * add its play UI to `ui.ts`, and add one line here.
 */
registerGame(phase10);
registerGame(uno);
registerGame(ticketToRide);
registerGame(ono99);
registerGame(poker);

export { listGames, getGame } from "@/engine/registry";
