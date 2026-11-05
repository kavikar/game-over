"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BoardProps, EntryProps, GameUI } from "@/components/play/game-ui";
import { Stepper } from "@/components/play/stepper";
import { Button, PlayerToken } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Phase10Action, Phase10State } from "./module";
import { PHASES } from "./phases";
import { CARD_POINTS, scoreHand, type CardKind } from "./scoring";

function Board({ state, standings, players }: BoardProps & { state: Phase10State }) {
  return (
    <ol className="grid gap-px bg-ivory/15 md:grid-cols-2">
      {standings.map((s) => {
        const p = players.find((x) => x.id === s.playerId)!;
        const phase = state.phase[p.id]!;
        const done = state.finishedPhase10[p.id];
        const req = PHASES[phase - 1]!.requirement;
        return (
          <li key={p.id} className="bg-forest p-4">
            <div className="flex items-center gap-3">
              <span className="num w-4 text-sm font-bold text-brass">{s.rank}</span>
              <PlayerToken id={p.id} name={p.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{p.name}</p>
                <p className="truncate text-sm text-ivory/70">{done ? "Completed Phase 10" : `Phase ${phase}: ${req}`}</p>
              </div>
              <p className="num text-5xl font-extrabold leading-none">{state.totals[p.id]}</p>
            </div>
            <div className="mt-3 flex gap-1" role="img" aria-label={`Phase ${phase} of 10${done ? ", all complete" : ""}`}>
              {PHASES.map((ph) => (
                <span key={ph.n} className={cn("h-2 flex-1", ph.n < phase || done ? "bg-brass" : ph.n === phase ? "bg-terracotta" : "bg-ivory/20")} />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface Row { completed: boolean; points: number | null }

function Form({ state, players, initial, validate, onSubmit, submitLabel }: EntryProps) {
  const s = state as Phase10State;
  const init = initial as Phase10Action | undefined;
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(players.map((p) => {
      const r = init?.results.find((x) => x.playerId === p.id);
      return [p.id, { completed: r?.completed ?? false, points: r ? r.points : null }];
    })),
  );
  const [out, setOut] = useState<string | null>(init?.wentOutId ?? null);
  const [counter, setCounter] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ message: string; severity?: "error" | "warning" }[]>([]);
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id]!, ...patch } }));
  const pick = (id: string) => {
    setOut(id);
    setRows((r) => {
      const n = { ...r };
      for (const p of players) if (p.id === id) n[p.id] = { completed: true, points: 0 };
      else if (n[p.id]!.points === 0) n[p.id] = { ...n[p.id]!, points: null };
      return n;
    });
  };

  const missing = players.filter((p) => rows[p.id]!.points === null).map((p) => p.name);
  const draft: Phase10Action | null = out && !missing.length
    ? { type: "round", wentOutId: out, results: players.map((p) => ({ playerId: p.id, completed: rows[p.id]!.completed, points: rows[p.id]!.points! })) }
    : null;
  const live = draft ? validate(draft) : [];
  const blocking = live.filter((i) => i.severity !== "warning");
  const warnings = [...live, ...issues].filter((i) => i.severity === "warning");
  const hasWarn = warnings.length > 0;

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!draft) return; const r = onSubmit(draft, hasWarn); if (r) setIssues(r); }}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <p className="text-sm text-moss-ink">Mark who went out, whether each player completed their phase, and the points left in their hand. Players move up independently.</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {players.map((p) => {
            const r = rows[p.id]!;
            const phase = s.phase[p.id]!;
            const isOut = out === p.id;
            return (
              <li key={p.id} className="py-3">
                <div className="flex items-center gap-3">
                  <PlayerToken id={p.id} name={p.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="truncate text-sm text-moss-ink">Phase {phase}: {PHASES[phase - 1]!.requirement}</p>
                  </div>
                  <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm font-bold", isOut ? "border-forest bg-forest text-ivory" : "border-charcoal/30")}>
                    <input type="radio" name="out" className="sr-only" checked={isOut} onChange={() => pick(p.id)} />
                    {isOut ? "Went out ✓" : "Went out"}
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 pl-12">
                  <div role="group" aria-label={`${p.name} completed phase`} className="inline-flex border border-charcoal/40">
                    {[true, false].map((v) => (
                      <button type="button" key={String(v)} disabled={isOut} aria-pressed={r.completed === v} onClick={() => set(p.id, { completed: v })}
                        className={cn("min-h-11 px-4 font-bold disabled:opacity-60", r.completed === v ? (v ? "bg-forest text-ivory" : "bg-terracotta text-charcoal") : "hover:bg-parchment")}>
                        {v ? "Completed" : "Not yet"}
                      </button>
                    ))}
                  </div>
                  <Stepper label={`${p.name} card points`} value={r.points} step={5} max={600} disabled={isOut} onChange={(n) => set(p.id, { points: n })} />
                  <button type="button" disabled={isOut} onClick={() => setCounter(counter === p.id ? null : p.id)} aria-expanded={counter === p.id} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-clay-ink underline underline-offset-4 disabled:opacity-40">
                    Count cards <ChevronDown size={14} aria-hidden className={cn(counter === p.id && "rotate-180")} />
                  </button>
                </div>
                {counter === p.id && <CardCounter onApply={(n) => { set(p.id, { points: n }); setCounter(null); }} />}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="safe-b border-t border-line px-4 pt-3 sm:px-6">
        {!out && <p className="mb-2 text-sm font-semibold text-clay-ink">Choose who went out.</p>}
        {out && missing.length > 0 && <p className="mb-2 text-sm font-semibold text-clay-ink">Still needed: card points for {missing.join(", ")}.</p>}
        {[...blocking, ...issues.filter((i) => i.severity !== "warning")].map((i, k) => <p key={k} role="alert" className="mb-1 text-sm font-semibold text-clay-ink">{i.message}</p>)}
        {warnings.map((i, k) => <p key={k} className="mb-1 text-sm font-semibold text-charcoal">⚠ {i.message}</p>)}
        <Button type="submit" size="lg" className="mb-1 w-full" disabled={!draft || blocking.length > 0}>
          {hasWarn ? "Confirm anyway" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CardCounter({ onApply }: { onApply: (n: number) => void }) {
  const [c, setC] = useState<Record<CardKind, number>>({ low: 0, high: 0, skip: 0, wild: 0 });
  const labels: Record<CardKind, string> = { low: "Cards 1–9", high: "Cards 10–12", skip: "Skip", wild: "Wild" };
  const total = scoreHand(c);
  return (
    <div className="mt-3 ml-12 border border-line bg-parchment/60 p-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(labels) as CardKind[]).map((k) => (
          <li key={k} className="flex items-center justify-between gap-2 text-sm">
            <span>{labels[k]} <span className="num text-moss-ink">× {CARD_POINTS[k]}</span></span>
            <Stepper label={labels[k]} value={c[k]} max={12} onChange={(n) => setC((x) => ({ ...x, [k]: n }))} />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <p className="num text-lg font-extrabold">{total} points</p>
        <Button type="button" size="sm" onClick={() => onApply(total)}>Use total</Button>
      </div>
    </div>
  );
}

export const phase10UI: GameUI = {
  Board: Board as GameUI["Board"],
  entry: { kind: "sheet", label: "Record hand", Form, correctable: true },
};
