"use client";

import { useState } from "react";
import type { BoardProps, GameUI, InlineProps } from "@/components/play/game-ui";
import { Stepper } from "@/components/play/stepper";
import { Button, PlayerToken } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fmtMoney, net, tournamentPayouts, totalChipsIssued, type PokerState } from "./module";

const ordinal = (n: number) => ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;

function Board({ state, standings, players }: BoardProps) {
  const s = state as PokerState;
  const pool = Object.values(s.buyIns).reduce((a, b) => a + b, 0) * s.config.buyIn;
  const chips = Object.entries(s.chips).reduce((a, [, c]) => a + c, 0);
  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-2 border-b border-ivory/20 pb-4">
        <div><p className="eyebrow text-brass">Total pot in play</p><p className="num display text-6xl leading-none">{fmtMoney(pool)}</p></div>
        <div><p className="eyebrow text-brass">Chips on table</p><p className="num display text-6xl leading-none">{chips.toLocaleString()}</p><p className="num text-xs text-ivory/60">of {totalChipsIssued(s).toLocaleString()} issued</p></div>
      </div>
      <ol className="mt-3 grid gap-px bg-ivory/15 sm:grid-cols-2">
        {standings.map((st) => {
          const p = players.find((x) => x.id === st.playerId)!;
          return (
            <li key={p.id} className="flex items-center gap-3 bg-forest px-3 py-3">
              <span className="num w-4 text-sm font-bold text-brass">{st.rank}</span>
              <PlayerToken id={p.id} name={p.name} size={40} />
              <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{p.name}</p><p className="truncate text-sm text-ivory/70">{st.detail}</p></div>
              <p className={cn("num text-3xl font-extrabold", net(s, p.id) < 0 && "text-terracotta")}>{st.display}</p>
            </li>
          );
        })}
      </ol>
      {s.config.mode === "tournament" && (
        <p className="num mt-2 text-sm text-ivory/70">Payouts: {tournamentPayouts(s).map((c, i) => `${ordinal(i + 1)} ${fmtMoney(c)}`).join(" · ")}</p>
      )}
    </div>
  );
}

function Panel({ state, players, act, disabled }: InlineProps) {
  const s = state as PokerState;
  const [vals, setVals] = useState<Record<string, number | null>>({});
  const [warn, setWarn] = useState<{ playerId: string; chips: number; msg: string } | null>(null);
  const tour = s.config.mode === "tournament";
  const left = players.filter((p) => !(p.id in s.cashedOut) && !s.busted.includes(p.id));
  const out = players.filter((p) => !left.includes(p));
  return (
    <div>
      <h2 className="display text-3xl">Table</h2>
      <ul className="mt-2 divide-y divide-ivory/15 border-y border-ivory/15">
        {left.map((p) => {
          const v = vals[p.id] ?? s.chips[p.id]!;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <PlayerToken id={p.id} name={p.name} size={36} />
              <span className="min-w-28 flex-1 font-bold">{p.name}</span>
              <Stepper dark label={`${p.name} chips`} value={v} step={s.config.chipsPerBuyIn >= 1000 ? 100 : 10} max={100_000_000} onChange={(n) => setVals((x) => ({ ...x, [p.id]: n }))} />
              <div className="flex flex-wrap gap-2">
                <Button variant="feltBtn" size="sm" disabled={disabled} onClick={() => act({ type: "chipCount", playerId: p.id, chips: v })}>Set count</Button>
                {s.config.allowRebuys && <Button variant="feltBtn" size="sm" disabled={disabled} onClick={() => act({ type: "rebuy", playerId: p.id })}>Rebuy</Button>}
                {tour ? (
                  <Button variant="clay" size="sm" disabled={disabled} onClick={() => act({ type: "bust", playerId: p.id })}>Bust</Button>
                ) : (
                  <Button variant="clay" size="sm" disabled={disabled} onClick={() => {
                    const r = act({ type: "cashOut", playerId: p.id, chips: v });
                    if (!r.ok && r.issues.every((i) => i.severity === "warning")) setWarn({ playerId: p.id, chips: v, msg: r.issues.map((i) => i.message).join(" ") });
                  }}>Cash out</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {warn && (
        <div role="alert" className="mt-3 border border-brass bg-brass/15 p-3">
          <p className="font-semibold">⚠ {warn.msg}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="clay" size="sm" onClick={() => { act({ type: "cashOut", playerId: warn.playerId, chips: warn.chips }, true); setWarn(null); }}>Confirm anyway</Button>
            <Button variant="feltBtn" size="sm" onClick={() => setWarn(null)}>Recount</Button>
          </div>
        </div>
      )}
      {out.length > 0 && <p className="mt-3 text-sm text-ivory/70">Left the table: {out.map((p) => p.name).join(", ")}</p>}
    </div>
  );
}

export const pokerUI: GameUI = { Board, entry: { kind: "inline", Panel } };
