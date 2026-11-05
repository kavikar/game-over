import "@/games";
import { getGame } from "@/engine/registry";
import { liveActions, replay } from "@/engine/session";
import type { AnyGameModule, Outcome, Session, Standing } from "@/engine/types";

export interface SessionView {
  mod: AnyGameModule;
  state: any;
  standings: Standing[];
  outcome: Outcome;
  error: boolean;
}

export function viewSession(session: Session): SessionView | null {
  const mod = getGame(session.gameId);
  if (!mod) return null;
  const r = replay(mod, session);
  return { mod, state: r.state, standings: mod.standings(r.state), outcome: mod.outcome(r.state), error: !!r.error };
}

/** State just before the n-th live action; used to validate/prefill corrections. */
export function stateBefore(session: Session, index: number) {
  const mod = getGame(session.gameId)!;
  return replay(mod, session, liveActions(session).slice(0, index)).state;
}
