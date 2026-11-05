"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clock, Home, Library, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/store";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Library },
  { href: "/players", label: "Players", icon: Users },
  { href: "/history", label: "History", icon: Clock },
  { href: "/rules", label: "Rules", icon: BookOpen },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-baseline gap-2" aria-label="GameNight home">
      <span className={cn("display text-[1.65rem] leading-none", light ? "text-ivory" : "text-forest")}>GameNight</span>
    </Link>
  );
}

export function SiteNav() {
  const path = usePathname();
  const { data } = useStore();
  const inSession = path.startsWith("/session/");
  const active = data.sessions.filter((s) => s.status === "active" || s.status === "paused").length;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ivory focus:p-2">Skip to content</a>
      <header className="border-b border-line bg-ivory/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-16">
          <Wordmark />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(path, l.href) ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 text-[0.92rem] font-semibold text-charcoal/75 hover:text-charcoal",
                  isActive(path, l.href) && "text-charcoal after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:bg-terracotta",
                )}
              >
                {l.label}
                {l.href === "/history" && active > 0 && <span className="num ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-[0.7rem] text-charcoal">{active}</span>}
              </Link>
            ))}
            <Link href="/games" className="ml-3 inline-flex min-h-10 items-center rounded-[6px] bg-forest px-4 text-sm font-semibold text-ivory hover:bg-forest-deep">
              New game
            </Link>
          </nav>
          <p className="hidden text-sm italic text-moss-ink lg:block display">One place for every game night.</p>
        </div>
      </header>
      {!inSession && (
        <nav aria-label="Primary" className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory md:hidden">
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {links.map((l) => {
              const Icon = l.icon;
              const on = isActive(path, l.href);
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 pt-2 text-[0.7rem] font-semibold", on ? "text-forest" : "text-charcoal/60")}>
                    <span className={cn("grid h-7 w-12 place-items-center rounded-full", on && "bg-parchment")}>
                      <Icon size={20} strokeWidth={on ? 2.4 : 1.8} aria-hidden />
                    </span>
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
