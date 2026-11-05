"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import "@/games";
import { getGame } from "@/engine/registry";
import { createSession, dispatch, type Clock, type Command } from "@/engine/session";
import type { PlayerRef, Result, Session } from "@/engine/types";
import { LocalRepository } from "./local-repository";
import { emptyData, type AppData, type Repository, type SavedPlayer } from "./types";

const clock: Clock = { now: () => new Date().toISOString(), id: () => crypto.randomUUID() };

class Store {
  private data: AppData = emptyData();
  private listeners = new Set<() => void>();
  hydrated = false;
  saveError: string | null = null;
  constructor(private repo: Repository) {}

  hydrate() {
    if (this.hydrated) return;
    this.data = this.repo.load();
    this.hydrated = true;
    this.emit();
  }
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  snapshot = () => this.data;
  private emit() {
    this.listeners.forEach((l) => l());
  }
  private set(next: AppData) {
    this.data = next;
    try {
      this.repo.save(next);
      this.saveError = null;
    } catch {
      this.saveError = "Changes could not be saved on this device. Storage may be full or blocked.";
    }
    this.emit();
  }

  addPlayer(name: string): SavedPlayer | null {
    const n = name.trim().slice(0, 24);
    if (!n) return null;
    if (this.data.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return null;
    const p: SavedPlayer = { id: crypto.randomUUID(), name: n, createdAt: clock.now() };
    this.set({ ...this.data, players: [...this.data.players, p] });
    return p;
  }
  renamePlayer(id: string, name: string): boolean {
    const n = name.trim().slice(0, 24);
    if (!n || this.data.players.some((p) => p.id !== id && p.name.toLowerCase() === n.toLowerCase())) return false;
    this.set({ ...this.data, players: this.data.players.map((p) => (p.id === id ? { ...p, name: n } : p)) });
    return true;
  }
  removePlayer(id: string) {
    this.set({ ...this.data, players: this.data.players.filter((p) => p.id !== id) });
  }
  toggleFavorite(gameId: string) {
    const f = this.data.favorites;
    this.set({ ...this.data, favorites: f.includes(gameId) ? f.filter((x) => x !== gameId) : [...f, gameId] });
  }
  createSession(gameId: string, players: PlayerRef[], config: unknown): Result<Session> {
    const mod = getGame(gameId);
    if (!mod) return { ok: false, issues: [{ message: "Unknown game." }] };
    const r = createSession(mod, { players, config }, clock);
    if (!r.ok) return r;
    this.set({ ...this.data, sessions: [r.value, ...this.data.sessions], recent: [gameId, ...this.data.recent.filter((g) => g !== gameId)].slice(0, 8) });
    return r;
  }
  command(sessionId: string, cmd: Command): Result<Session> {
    const s = this.data.sessions.find((x) => x.id === sessionId);
    if (!s) return { ok: false, issues: [{ message: "Session not found." }] };
    const mod = getGame(s.gameId);
    if (!mod) return { ok: false, issues: [{ message: "This game module is not installed." }] };
    const r = dispatch(mod, s, cmd, clock);
    if (r.ok && !r.duplicate) this.set({ ...this.data, sessions: this.data.sessions.map((x) => (x.id === sessionId ? r.value : x)) });
    return r;
  }
  deleteSession(id: string) {
    this.set({ ...this.data, sessions: this.data.sessions.filter((s) => s.id !== id) });
  }
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Store | null>(null);
  if (!ref.current) ref.current = new Store(new LocalRepository());
  const store = ref.current;
  useEffect(() => store.hydrate(), [store]);
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}

const empty = emptyData();

export function useStore() {
  const store = useContext(StoreCtx);
  if (!store) throw new Error("StoreProvider missing");
  const data = useSyncExternalStore(store.subscribe, store.snapshot, () => empty);
  return useMemo(() => ({ store, data, hydrated: store.hydrated, saveError: store.saveError }), [store, data]);
}
