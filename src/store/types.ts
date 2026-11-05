import type { Session } from "@/engine/types";

export interface SavedPlayer {
  id: string;
  name: string;
  createdAt: string;
}

export interface AppData {
  version: 1;
  players: SavedPlayer[];
  sessions: Session[];
  favorites: string[];
  /** Game ids, most recent first. */
  recent: string[];
}

export const emptyData = (): AppData => ({ version: 1, players: [], sessions: [], favorites: [], recent: [] });

/** Persistence port. Local storage today; a Supabase adapter implements the same shape. */
export interface Repository {
  load(): AppData;
  save(data: AppData): void;
}
