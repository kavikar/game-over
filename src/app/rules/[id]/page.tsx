import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@/games";
import { getGame, listGames } from "@/engine/registry";
import { Button, Eyebrow, PageShell } from "@/components/ui";
import { StatusTag, VerificationBadge } from "@/components/rules-view";

export function generateStaticParams() {
  return listGames().map((g) => ({ id: g.meta.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${getGame(id)?.meta.name ?? "Game"} rules` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = getGame(id);
  if (!g) notFound();
  const r = g.rules;
  return (
    <PageShell className="max-w-4xl">
      <Link href="/rules" className="text-sm font-semibold text-clay-ink underline underline-offset-4">← Rules library</Link>
      <Eyebrow className="mt-6">Rules version {r.rulesVersion}</Eyebrow>
      <h1 className="display mt-1 text-5xl text-forest sm:text-6xl">{g.meta.name}</h1>
      <p className="mt-4 text-lg"><strong>Objective.</strong> {r.objective}</p>
      <p className="mt-1 text-charcoal/80"><strong>Players.</strong> {r.players}</p>

      <section className="mt-8 border-l-4 border-brass bg-parchment/70 p-4" aria-labelledby="src">
        <h2 id="src" className="eyebrow text-moss-ink">Sources &amp; verification</h2>
        <ul className="mt-3 space-y-4">
          {r.sources.map((s) => (
            <li key={s.sourceUrl}>
              <p className="font-bold">{s.publisher} · {s.edition} <VerificationBadge v={s.verification} /></p>
              <p className="text-sm text-moss-ink">{s.sourceType} source · last verified {s.lastVerified ?? "never (not reached directly)"}</p>
              <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener" className="break-all text-sm font-semibold text-clay-ink underline underline-offset-4">{s.sourceUrl}</a>
              {s.note && <p className="mt-1 text-sm">{s.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="eyebrow text-moss-ink">Components</h2>
        <ul className="mt-2 list-disc pl-5">{r.components.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>

      {r.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="display text-3xl">{s.heading}<StatusTag s={s.status} /></h2>
          <div className="mt-2 max-w-2xl space-y-2">{s.body.map((b, i) => <p key={i}>{b}</p>)}</div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="display text-3xl">FAQ</h2>
        <dl className="mt-3 divide-y divide-line border-y border-line">
          {r.faq.map((f) => (
            <div key={f.q} className="py-3">
              <dt className="font-bold">{f.q}<StatusTag s={f.status} /></dt>
              <dd className="mt-1 max-w-2xl">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="display text-3xl">Editions</h2>
          <ul className="mt-2 space-y-2">{r.editions.map((e) => <li key={e.id}><strong>{e.name}.</strong> {e.note}</li>)}</ul>
        </div>
        <div>
          <h2 className="display text-3xl">House rules</h2>
          {r.houseRules.length ? <ul className="mt-2 space-y-2">{r.houseRules.map((h) => <li key={h.id}><strong>{h.name}.</strong> {h.description}</li>)}</ul> : <p className="mt-2 text-moss-ink">None for this game yet.</p>}
          <p className="mt-3 text-sm text-moss-ink">House rules are set when you start a session and are recorded with it.</p>
        </div>
      </section>

      <div className="mt-10"><Link href={`/new/${g.meta.id}`}><Button size="lg">Start a session</Button></Link></div>
    </PageShell>
  );
}
