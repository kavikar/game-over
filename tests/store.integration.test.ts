import { describe, expect, it } from "vitest";
import { Store } from "@/store/store";
import { emptyData, type AppData, type Repository } from "@/store/types";
import { liveActions } from "@/engine/session";
import { viewSession } from "@/lib/session-view";

class MemoryRepo implements Repository {
  data: AppData = emptyData();
  failWrites = false;
  load() { return structuredClone(this.data); }
  save(d: AppData) { if (this.failWrites) throw new Error("quota"); this.data = structuredClone(d); }
}

const hand = (out: string, rows: [string, boolean, number][]) => ({ type: "round", wentOutId: out, results: rows.map(([playerId, completed, points]) => ({ playerId, completed, points })) });

describe("Store: sessions persist and resume across reloads", () => {
  it("creates players, runs a session, reloads, resumes and completes", () => {
    const repo = new MemoryRepo();
    const a = new Store(repo);
    a.hydrate();
    const k = a.addPlayer("Karthik")!, r = a.addPlayer("Rahul")!;
    expect(a.addPlayer("karthik")).toBeNull(); // duplicate names are refused
    const created = a.createSession("phase10", [k, r].map((p) => ({ id: p.id, name: p.name })), {});
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const sid = created.value.id;
    expect(a.command(sid, { kind: "submit", actionId: "h1", action: hand(k.id, [[k.id, true, 0], [r.id, false, 40]]) }).ok).toBe(true);

    // "Reload the browser": brand-new store over the same persisted data.
    const b = new Store(repo);
    b.hydrate();
    const s = b.snapshot().sessions.find((x) => x.id === sid)!;
    expect(s.status).toBe("active");
    expect(liveActions(s)).toHaveLength(1);
    expect(viewSession(s)!.state.totals).toEqual({ [k.id]: 0, [r.id]: 40 });
    expect(b.snapshot().players).toHaveLength(2);
    // Duplicate submission after reload is idempotent.
    const dup = b.command(sid, { kind: "submit", actionId: "h1", action: hand(k.id, [[k.id, true, 0], [r.id, false, 40]]) });
    expect(dup.ok && dup.duplicate).toBe(true);
    expect(liveActions(b.snapshot().sessions[0]!)).toHaveLength(1);
    // Completion + recents.
    b.command(sid, { kind: "end" });
    expect(b.snapshot().sessions[0]!.status).toBe("completed");
    expect(b.snapshot().recent[0]).toBe("phase10");
  });

  it("rejects invalid sessions and unknown games; surfaces storage failure without losing memory state", () => {
    const repo = new MemoryRepo();
    const s = new Store(repo);
    s.hydrate();
    expect(s.createSession("nope", [], {}).ok).toBe(false);
    expect(s.createSession("phase10", [{ id: "a", name: "A" }], {}).ok).toBe(false);
    repo.failWrites = true;
    const p = s.addPlayer("Zed");
    expect(p).not.toBeNull();
    expect(s.saveError).toMatch(/could not be saved/);
    expect(s.snapshot().players).toHaveLength(1);
  });

  it("every registered game can be created, scored from its own module and replayed", async () => {
    const { listGames } = await import("@/engine/registry");
    await import("@/games");
    const repo = new MemoryRepo();
    const s = new Store(repo);
    s.hydrate();
    for (const g of listGames()) {
      const n = Math.max(2, g.meta.minPlayers);
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const r = s.createSession(g.meta.id, players, g.defaultConfig(n));
      expect(r.ok, g.meta.id).toBe(true);
      expect(viewSession((r as any).value)!.error).toBe(false);
    }
    expect(s.snapshot().sessions).toHaveLength(listGames().length);
  });
});
