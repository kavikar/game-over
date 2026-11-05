import type { AnyGameModule } from "./types";

const modules = new Map<string, AnyGameModule>();

/** Register a game module. Safe to call repeatedly with the same module (HMR). */
export function registerGame(mod: AnyGameModule): void {
  modules.set(mod.meta.id, mod);
}

export function getGame(id: string): AnyGameModule | undefined {
  return modules.get(id);
}

export function listGames(): AnyGameModule[] {
  return [...modules.values()];
}
