"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import "@/games";
import { getGame } from "@/engine/registry";
import { computeStats, headToHead, MIN_SAMPLE } from "@/engine/stats";
import { Button, Empty, Eyebrow, PageShell, PlayerToken } from "@/components/ui";
import { useStore } from "@/store/store";

export function PlayersView() {
  const { data, store } = useStore();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const stats = computeStats(data.sessions);

  const add = () => {
    const p = store.addPlayer(name);
    if (!p) return setErr(name.trim() ? "That name is already saved." : "Enter a name first.");
    setName(""); setErr("");
  };
  const h2h = a && b && a !== b ? headToHead(data.sessions, a, b) : null;
  const nm = (id: string) => data.players.find((p) => p.id === id)?.name ?? "";

  return (
    <PageShell className="max-w-4xl">
      <Eyebrow>Your regulars</Eyebrow>
      <h1 className="display mt-2 text-5xl text-forest sm:text-6xl">Players.</h1>
      <p className="mt-3 max-w-xl text-lg text-charcoal/80">No accounts needed. Save the people you play with, or add guests while setting up a game.</p>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="flex-1 basis-56">
          <span className="eyebrow text-moss-ink">New player</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} maxLength={24} placeholder="Name" className="mt-1 min-h-11 w-full border-b-2 border-charcoal/70 bg-transparent text-lg outline-none focus:border-terracotta" />
        </label>
        <Button type="submit">Save player</Button>
        {err && <p role="alert" className="w-full text-sm font-semibold text-clay-ink">{err}</p>}
      </form>

      {data.players.length === 0 ? (
        <div className="mt-8"><Empty title="No players yet." body="Add someone above, then seat them in any game in two taps." /></div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {data.players.map((p) => {
            const s = stats.get(p.id);
            const gameRows = s ? Object.entries(s.perGame) : [];
            return (
              <li key={p.id} className="py-4">
                <div className="flex items-center gap-3">
                  <PlayerToken id={p.id} name={p.name} size={46} />
                  {editing === p.id ? (
                    <form className="flex flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (store.renamePlayer(p.id, draft)) setEditing(null); }}>
                      <label className="flex-1"><span className="sr-only">Rename {p.name}</span><input autoFocus value={draft} maxLength={24} onChange={(e) => setDraft(e.target.value)} className="min-h-11 w-full border-b-2 border-charcoal bg-transparent text-lg font-bold outline-none" /></label>
                      <button aria-label="Save name" className="grid h-11 w-11 place-items-center hover:bg-parchment"><Check size={18} aria-hidden /></button>
                      <button type="button" aria-label="Cancel" onClick={() => setEditing(null)} className="grid h-11 w-11 place-items-center hover:bg-parchment"><X size={18} aria-hidden /></button>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-xl font-bold">{p.name}</p>
                        <p className="num text-sm text-moss-ink">
                          {s ? `${s.gamesPlayed} finished ${s.gamesPlayed === 1 ? "game" : "games"} · ${s.wins} ${s.wins === 1 ? "win" : "wins"}${s.winRate !== null ? ` · ${Math.round(s.winRate * 100)}% win rate` : ` · win rate after ${MIN_SAMPLE} games`}` : "No finished games yet"}
                        </p>
                      </div>
                      <button aria-label={`Rename ${p.name}`} onClick={() => { setEditing(p.id); setDraft(p.name); }} className="grid h-11 w-11 place-items-center hover:bg-parchment"><Pencil size={18} aria-hidden /></button>
                      <button aria-label={`Delete ${p.name}`} onClick={() => { if (confirm(`Remove ${p.name} from saved players? Past games keep their name.`)) store.removePlayer(p.id); }} className="grid h-11 w-11 place-items-center hover:bg-parchment"><Trash2 size={18} aria-hidden /></button>
                    </>
                  )}
                </div>
                {gameRows.length > 0 && (
                  <table className="num mt-3 ml-0 w-full text-sm sm:ml-14 sm:w-[calc(100%-3.5rem)]">
                    <thead><tr className="text-left text-moss-ink"><th className="py-1 font-semibold">Game</th><th className="font-semibold">Played</th><th className="font-semibold">Wins</th><th className="font-semibold">Average</th><th className="font-semibold">Best</th></tr></thead>
                    <tbody>
                      {gameRows.map(([gid, g]) => (
                        <tr key={gid} className="border-t border-line">
                          <td className="py-1.5 font-semibold">{getGame(gid)?.meta.name ?? gid}</td><td>{g.played}</td><td>{g.wins}</td>
                          <td>{g.avgValue === null ? <span className="text-moss-ink">needs {MIN_SAMPLE}+ games</span> : g.avgValue.toFixed(1)}</td><td>{g.best ?? "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data.players.length >= 2 && (
        <section className="mt-12" aria-labelledby="h2h">
          <h2 id="h2h" className="display text-3xl">Head to head</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {[[a, setA], [b, setB]].map(([v, set], i) => (
              <label key={i}><span className="sr-only">Player {i + 1}</span>
                <select value={v as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} className="min-h-11 border border-charcoal/40 bg-ivory px-3 font-semibold">
                  <option value="">Choose…</option>{data.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ))}
          </div>
          {h2h && (h2h.together === 0
            ? <p className="mt-3 text-moss-ink">{nm(a)} and {nm(b)} have not finished a game together.</p>
            : <p className="num mt-3 text-lg"><strong>{nm(a)}</strong> {h2h.aWins} – {h2h.bWins} <strong>{nm(b)}</strong> <span className="text-moss-ink">across {h2h.together} shared {h2h.together === 1 ? "game" : "games"}{h2h.together < MIN_SAMPLE ? " (small sample)" : ""}</span></p>)}
        </section>
      )}
    </PageShell>
  );
}
