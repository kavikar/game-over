import Link from "next/link";
import type { Metadata } from "next";
import "@/games";
import { listGames } from "@/engine/registry";
import { Eyebrow, PageShell } from "@/components/ui";
import { VerificationBadge } from "@/components/rules-view";

export const metadata: Metadata = { title: "Rules library" };

export default function Page() {
  return (
    <PageShell>
      <Eyebrow>Rules library</Eyebrow>
      <h1 className="display mt-2 text-5xl text-forest sm:text-6xl">How each game is scored.</h1>
      <p className="mt-3 max-w-2xl text-lg text-charcoal/80">
        These are short explanations written for GameNight, not copies of rulebooks. Every rule is labelled as official, an app interpretation, a house rule, or unverified. Always trust the rulebook in your box over this page.
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {listGames().map((g) => {
          const v = g.rules.sources.some((s) => s.verification === "unverified") ? "unverified" : g.rules.sources.some((s) => s.verification === "partial") ? "partial" : "verified";
          return (
            <li key={g.meta.id}>
              <Link href={`/rules/${g.meta.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-4 hover:bg-parchment/60">
                <span><span className="display text-3xl">{g.meta.name}</span> <span className="num ml-2 text-sm text-moss-ink">{g.rulesVersion}</span></span>
                <VerificationBadge v={v} />
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
