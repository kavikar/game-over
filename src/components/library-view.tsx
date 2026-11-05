"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";
import "@/games";
import { listGames } from "@/engine/registry";
import type { GameCategory } from "@/engine/types";
import { GameCover } from "@/components/cover";
import { Eyebrow, Empty, PageShell } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/store";

const CATS: GameCategory[] = ["Card Games", "Board Games", "Strategy Games", "Party Games", "Family Games", "Poker and Casino-style Games"];

export function LibraryView() {
  const { data, store } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GameCategory | "All" | "Favorites">("All");
  const [players, setPlayers] = useState<number | null>(null);
  const all = listGames();

  const shown = useMemo(
    () =>
      all.filter((g) => {
        const m = g.meta;
        if (q && !`${m.name} ${m.description} ${m.categories.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (cat === "Favorites") return data.favorites.includes(m.id);
        if (cat !== "All" && !m.categories.includes(cat)) return false;
        if (players && (players < m.minPlayers || players > m.maxPlayers)) return false;
        return true;
      }),
    [all, q, cat, players, data.favorites],
  );
  const feature = shown.find((g) => g.meta.featured) ?? null;
  const rest = shown.filter((g) => g !== feature);

  return (
    <PageShell>
      <Eyebrow>The collection</Eyebrow>
      <h1 className="display mt-2 text-5xl text-forest sm:text-6xl">Pick a game.</h1>
      <p className="mt-3 max-w-xl text-lg text-charcoal/80">Each game ships its own scoring, setup and rules, so the scoreboard fits the game rather than the other way around.</p>

      <div className="mt-8 space-y-4 border-y border-line py-4">
        <label className="flex items-center gap-3 border-b-2 border-charcoal/70 pb-1.5 focus-within:border-terracotta">
          <Search size={20} aria-hidden />
          <span className="sr-only">Search games</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or kind of game" className="min-h-10 w-full bg-transparent text-lg outline-none placeholder:text-charcoal/50" />
        </label>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          {(["All", "Favorites", ...CATS] as const).map((c) => (
            <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("min-h-9 border px-3 text-sm font-semibold", cat === c ? "border-forest bg-forest text-ivory" : "border-charcoal/30 hover:bg-parchment")}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by player count">
          <span className="eyebrow mr-1 text-moss-ink">Players</span>
          {[null, 2, 3, 4, 5, 6, 8].map((n) => (
            <button key={String(n)} aria-pressed={players === n} onClick={() => setPlayers(n)} className={cn("num min-h-9 min-w-9 border px-2.5 text-sm font-semibold", players === n ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/30 hover:bg-parchment")}>
              {n ?? "Any"}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mt-8"><Empty title="Nothing on this shelf." body="No game matches those filters. Try clearing the search or the player count." /></div>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
          {feature && (
            <article className="relative sm:col-span-2 lg:col-span-7">
              <Link href={`/games/${feature.meta.id}`} className="grid gap-5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-end">
                <GameCover meta={feature.meta} className="aspect-[3/4] w-full max-w-52 rounded-[4px] shadow-[0_14px_30px_-18px_rgba(36,37,34,0.9)]" />
                <div>
                  <p className="eyebrow text-clay-ink">Featured · reference implementation</p>
                  <h2 className="display mt-1 text-4xl">{feature.meta.name}</h2>
                  <p className="mt-2 text-charcoal/80">{feature.meta.description}</p>
                  <Meta g={feature.meta} />
                </div>
              </Link>
              <Fav id={feature.meta.id} on={data.favorites.includes(feature.meta.id)} toggle={() => store.toggleFavorite(feature.meta.id)} />
            </article>
          )}
          {rest.map((g, i) => (
            <article key={g.meta.id} className={cn("relative", feature ? (i === 0 ? "lg:col-span-5" : "lg:col-span-4") : "lg:col-span-4")}>
              <Link href={`/games/${g.meta.id}`} className="flex gap-4">
                <GameCover meta={g.meta} className="aspect-[3/4] w-28 shrink-0 rounded-[4px] shadow-[0_10px_22px_-16px_rgba(36,37,34,0.9)] sm:w-32" />
                <div className="pr-8">
                  <p className="eyebrow text-moss-ink">{g.meta.categories[0]}</p>
                  <h2 className="display mt-1 text-3xl">{g.meta.name}</h2>
                  <p className="mt-1 line-clamp-3 text-sm text-charcoal/80">{g.meta.description}</p>
                  <Meta g={g.meta} />
                </div>
              </Link>
              <Fav id={g.meta.id} on={data.favorites.includes(g.meta.id)} toggle={() => store.toggleFavorite(g.meta.id)} />
            </article>
          ))}
        </div>
      )}
      <p className="mt-12 text-xs text-moss-ink">Covers are original placeholder art generated by GameNight. Game names belong to their publishers; GameNight is not affiliated with them.</p>
    </PageShell>
  );
}

function Meta({ g }: { g: { minPlayers: number; maxPlayers: number; duration: [number, number]; scoringType: string } }) {
  return (
    <p className="num mt-3 text-sm font-semibold text-moss-ink">
      {g.minPlayers}–{g.maxPlayers} players · {g.duration[0]}–{g.duration[1]} min · {g.scoringType}
    </p>
  );
}

function Fav({ on, toggle, id }: { on: boolean; toggle: () => void; id: string }) {
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? `Remove ${id} from favorites` : `Add ${id} to favorites`} className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-clay-ink hover:bg-parchment">
      <Heart size={22} fill={on ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
