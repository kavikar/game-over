import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@/games";
import { getGame, listGames } from "@/engine/registry";
import { GameCover } from "@/components/cover";
import { Button, Eyebrow, PageShell } from "@/components/ui";
import { PHASES } from "@/games/phase10/phases";
import { VerificationBadge } from "@/components/rules-view";

export function generateStaticParams() {
  return listGames().map((g) => ({ id: g.meta.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getGame(id)?.meta.name ?? "Game" };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = getGame(id);
  if (!g) notFound();
  const m = g.meta;
  const worst = g.rules.sources.some((s) => s.verification === "unverified") ? "unverified" : g.rules.sources.some((s) => s.verification === "partial") ? "partial" : "verified";
  return (
    <PageShell>
      <div className="grid gap-8 md:grid-cols-[18rem_1fr] md:gap-12">
        <GameCover meta={m} className="aspect-[3/4] w-full max-w-64 rounded-[4px] shadow-[0_18px_36px_-20px_rgba(36,37,34,0.9)] md:max-w-none" />
        <div>
          <Eyebrow>{m.categories.join(" · ")}</Eyebrow>
          <h1 className="display mt-2 text-5xl text-forest sm:text-6xl">{m.name}</h1>
          <p className="display mt-2 text-2xl text-clay-ink">{m.tagline}</p>
          <p className="mt-4 max-w-xl text-lg">{m.description}</p>
          <dl className="num mt-6 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
            <Fact k="Players" v={`${m.minPlayers}–${m.maxPlayers}`} />
            <Fact k="Time" v={`${m.duration[0]}–${m.duration[1]} min`} />
            <Fact k="Editions" v={m.editions.join(", ")} />
            <Fact k="Rules" v={<VerificationBadge v={worst} />} />
          </dl>
          <p className="mt-4 text-sm text-moss-ink">Scoring: {m.scoringType}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/new/${m.id}`}><Button size="lg">Start a session</Button></Link>
            <Link href={`/rules/${m.id}`}><Button size="lg" variant="outline">Rules &amp; sources</Button></Link>
          </div>
        </div>
      </div>
      {m.id === "phase10" && (
        <section className="mt-14" aria-labelledby="phases">
          <Eyebrow>Classic edition</Eyebrow>
          <h2 id="phases" className="display mt-1 text-3xl">The ten phases</h2>
          <ol className="mt-4 grid gap-x-10 border-t border-line sm:grid-cols-2">
            {PHASES.map((p) => (
              <li key={p.n} className="flex items-baseline gap-4 border-b border-line py-2.5">
                <span className="num display w-8 text-2xl text-clay-ink">{p.n}</span>
                <span>{p.requirement}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </PageShell>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-moss-ink">{k}</dt>
      <dd className="mt-1 font-bold">{v}</dd>
    </div>
  );
}
