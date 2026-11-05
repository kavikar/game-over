"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EntryProps, GameUI } from "@/components/play/game-ui";
import { Stepper } from "@/components/play/stepper";
import { Button, PlayerToken } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { UnoAction, UnoState } from "./module";
import { scoreUnoHand, UNO_VALUES } from "./scoring";

function Form({ state, players, initial, validate, onSubmit, submitLabel }: EntryProps) {
  const s = state as UnoState;
  const init = initial as UnoAction | undefined;
  const [winner, setWinner] = useState<string | null>(init?.winnerId ?? null);
  const [pts, setPts] = useState<Record<string, number | null>>(() => Object.fromEntries(players.map((p) => [p.id, init?.hands.find((h) => h.playerId === p.id)?.points ?? null])));
  const [open, setOpen] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ message: string; severity?: "error" | "warning" }[]>([]);
  const losers = players.filter((p) => p.id !== winner);
  const missing = losers.filter((p) => pts[p.id] === null).map((p) => p.name);
  const draft: UnoAction | null = winner && !missing.length ? { type: "round", winnerId: winner, hands: losers.map((p) => ({ playerId: p.id, points: pts[p.id]! })) } : null;
  const live = draft ? validate(draft) : [];
  const blocking = live.filter((i) => i.severity !== "warning");
  const warn = [...live, ...issues].filter((i) => i.severity === "warning");
  const gain = draft ? draft.hands.reduce((a, h) => a + h.points, 0) : 0;

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!draft) return; const r = onSubmit(draft, warn.length > 0); if (r) setIssues(r); }}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <fieldset>
          <legend className="font-bold">Who went out?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {players.map((p) => (
              <label key={p.id} className={cn("flex min-h-12 cursor-pointer items-center gap-2 border py-1 pl-1 pr-3 font-semibold", winner === p.id ? "border-forest bg-forest text-ivory" : "border-charcoal/30 hover:bg-parchment")}>
                <input type="radio" name="winner" className="sr-only" checked={winner === p.id} onChange={() => setWinner(p.id)} />
                <PlayerToken id={p.id} name={p.name} size={36} /> {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        {winner && (
          <>
            <p className="mt-5 font-bold">Points left in each hand</p>
            <ul className="mt-1 divide-y divide-line border-y border-line">
              {losers.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <PlayerToken id={p.id} name={p.name} size={34} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                    <Stepper label={`${p.name} hand points`} value={pts[p.id] ?? null} step={5} max={1000} onChange={(n) => setPts((x) => ({ ...x, [p.id]: n }))} />
                    <button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-clay-ink underline underline-offset-4">Count <ChevronDown size={14} aria-hidden className={cn(open === p.id && "rotate-180")} /></button>
                  </div>
                  {open === p.id && <Counter onUse={(n) => { setPts((x) => ({ ...x, [p.id]: n })); setOpen(null); }} />}
                </li>
              ))}
            </ul>
            {draft && <p className="num mt-4 text-lg font-extrabold">{s.config.mode === "traditional" ? `${players.find((p) => p.id === winner)!.name} scores +${gain}` : `Each hand is added to its owner's total`}</p>}
          </>
        )}
      </div>
      <div className="safe-b border-t border-line px-4 pt-3 sm:px-6">
        {!winner && <p className="mb-2 text-sm font-semibold text-clay-ink">Choose who went out.</p>}
        {winner && missing.length > 0 && <p className="mb-2 text-sm font-semibold text-clay-ink">Still needed: {missing.join(", ")}.</p>}
        {[...blocking, ...issues.filter((i) => i.severity !== "warning")].map((i, k) => <p key={k} role="alert" className="mb-1 text-sm font-semibold text-clay-ink">{i.message}</p>)}
        {warn.map((i, k) => <p key={k} className="mb-1 text-sm font-semibold">⚠ {i.message}</p>)}
        <Button type="submit" size="lg" className="mb-1 w-full" disabled={!draft || blocking.length > 0}>{warn.length ? "Confirm anyway" : submitLabel}</Button>
      </div>
    </form>
  );
}

function Counter({ onUse }: { onUse: (n: number) => void }) {
  const [c, setC] = useState({ numberSum: 0, actions: 0, wilds: 0 });
  const total = scoreUnoHand(c);
  return (
    <div className="mt-3 border border-line bg-parchment/60 p-3">
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between gap-2"><span>Number cards, sum of faces</span><Stepper label="Number card total" value={c.numberSum} max={300} onChange={(n) => setC((x) => ({ ...x, numberSum: n }))} /></li>
        <li className="flex items-center justify-between gap-2"><span>Draw 2 / Reverse / Skip <span className="num text-moss-ink">× {UNO_VALUES.action}</span></span><Stepper label="Action cards" value={c.actions} max={30} onChange={(n) => setC((x) => ({ ...x, actions: n }))} /></li>
        <li className="flex items-center justify-between gap-2"><span>Wild / Wild Draw 4 <span className="num text-moss-ink">× {UNO_VALUES.wild}</span></span><Stepper label="Wild cards" value={c.wilds} max={30} onChange={(n) => setC((x) => ({ ...x, wilds: n }))} /></li>
      </ul>
      <div className="mt-3 flex items-center justify-between"><p className="num text-lg font-extrabold">{total} points</p><Button type="button" size="sm" onClick={() => onUse(total)}>Use total</Button></div>
    </div>
  );
}

export const unoUI: GameUI = { entry: { kind: "sheet", label: "Record round", Form, correctable: true } };
