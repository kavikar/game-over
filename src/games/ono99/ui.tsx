"use client";

import { ArrowLeftRight, Heart } from "lucide-react";
import type { BoardProps, GameUI, InlineProps } from "@/components/play/game-ui";
import { Button, PlayerToken } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIMIT, legalCards, type Ono99Card, type Ono99State } from "./module";

function Board({ state, players }: BoardProps) {
  const s = state as Ono99State;
  const over = s.players.filter((p) => s.lives[p.id]! > 0).length <= 1;
  const cur = s.players[s.current]!;
  return (
    <div>
      <div className="flex items-end justify-between border-b border-ivory/20 pb-4">
        <div>
          <p className="eyebrow text-brass">Pile</p>
          <p className="num display text-8xl leading-none sm:text-9xl" aria-live="polite">{s.pile}<span className="text-3xl text-ivory/50"> / {LIMIT}</span></p>
        </div>
        <div className="text-right text-sm text-ivory/80">
          <p className="inline-flex items-center gap-1"><ArrowLeftRight size={14} aria-hidden /> {s.direction === 1 ? "Clockwise" : "Counter-clockwise"}</p>
          {s.turnsLeft > 1 && <p className="font-bold text-brass">Plays {s.turnsLeft} cards (Play 2)</p>}
        </div>
      </div>
      <ol className="mt-3 grid gap-px bg-ivory/15 sm:grid-cols-2">
        {players.map((p) => {
          const lives = s.lives[p.id]!;
          const turn = !over && cur.id === p.id;
          return (
            <li key={p.id} aria-current={turn ? "true" : undefined} className={cn("flex items-center gap-3 bg-forest px-3 py-3", turn && "bg-forest-deep ring-2 ring-inset ring-terracotta")}>
              <PlayerToken id={p.id} name={p.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-lg font-bold", lives <= 0 && "line-through opacity-60")}>{p.name}</p>
                <p className="text-sm text-ivory/70">{lives <= 0 ? "Eliminated" : turn ? "Their turn" : " "}</p>
              </div>
              <div className="flex gap-1" role="img" aria-label={`${lives} ${lives === 1 ? "life" : "lives"}`}>
                {Array.from({ length: s.config.startingLives }, (_, i) => <Heart key={i} size={20} aria-hidden fill={i < lives ? "#C87554" : "none"} stroke={i < lives ? "#C87554" : "rgba(245,240,230,.35)"} />)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const LABEL = (c: Ono99Card) => (c.kind === "number" ? String(c.value) : { minus10: "−10", reverse: "Reverse", play2: "Play 2", ono99: "ONO 99", skip: "Skip" }[c.kind]);

function Panel({ state, act, disabled }: InlineProps) {
  const s = state as Ono99State;
  const over = s.players.filter((p) => s.lives[p.id]! > 0).length <= 1;
  const cur = s.players[s.current]!;
  const legal = legalCards(s);
  const all: Ono99Card[] = [...Array.from({ length: 10 }, (_, v) => ({ kind: "number", value: v }) as Ono99Card), { kind: "minus10" }, { kind: "reverse" }, { kind: "play2" }, { kind: "ono99" }, ...(s.config.skipCard ? [{ kind: "skip" } as Ono99Card] : [])];
  const ok = (c: Ono99Card) => legal.some((l) => JSON.stringify(l) === JSON.stringify(c));
  if (over) return <p className="text-lg font-bold">Game over.</p>;
  return (
    <div>
      <h2 className="display text-3xl">{cur.name}&apos;s turn</h2>
      <p className="text-sm text-ivory/70">Tap the card they played. Cards that would break the 99 limit or the zero floor are disabled.</p>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-5">
        {all.map((c) => (
          <button key={JSON.stringify(c)} disabled={disabled || !ok(c)} onClick={() => act({ type: "play", playerId: cur.id, card: c })}
            className={cn("num min-h-16 border border-ivory/40 px-1 text-xl font-extrabold hover:bg-ivory/10 disabled:opacity-30", c.kind !== "number" && "text-base")}>
            {LABEL(c)}
          </button>
        ))}
      </div>
      <Button variant="clay" size="lg" className="mt-4 w-full sm:w-auto" disabled={disabled} onClick={() => act({ type: "bust", playerId: cur.id })}>
        {cur.name} can&apos;t play safely — lose a life
      </Button>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-bold">Play log (this round)</summary>
        <ol className="num mt-2 space-y-1 text-sm text-ivory/80">{s.log.filter((l) => l.round === s.round).map((l, i) => <li key={i}>{l.text}</li>)}{!s.log.some((l) => l.round === s.round) && <li>No cards yet.</li>}</ol>
      </details>
    </div>
  );
}

export const ono99UI: GameUI = { Board, entry: { kind: "inline", Panel } };
