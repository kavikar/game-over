"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials, tokenColor } from "@/lib/format";

type Variant = "primary" | "clay" | "ghost" | "outline" | "feltBtn";
const variants: Record<Variant, string> = {
  primary: "bg-forest text-ivory hover:bg-forest-deep",
  clay: "bg-terracotta text-charcoal hover:bg-[#d4825f]",
  ghost: "bg-transparent text-charcoal hover:bg-parchment",
  outline: "border border-charcoal/40 text-charcoal hover:bg-parchment",
  feltBtn: "border border-ivory/40 text-ivory hover:bg-ivory/10",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" | "sm" }
>(function Button({ variant = "primary", size = "md", className, ...p }, ref) {
  return (
    <button
      ref={ref}
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[6px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-[0.95rem]",
        size === "lg" && "min-h-14 px-6 text-base",
        variants[variant],
        className,
      )}
    />
  );
});

export function PlayerToken({ id, name, size = 40, ring = false }: { id: string; name: string; size?: number; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full border-2 border-ivory/60 font-bold text-ivory", ring && "ring-2 ring-brass ring-offset-2 ring-offset-forest")}
      style={{ width: size, height: size, background: tokenColor(id), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow text-moss-ink", className)}>{children}</p>;
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main id="main" className={cn("mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10", className)}>{children}</main>;
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-forest text-ivory",
    paused: "bg-brass text-charcoal",
    completed: "bg-parchment text-charcoal border border-line",
    cancelled: "bg-charcoal/10 text-charcoal/70",
  };
  return <span className={cn("eyebrow rounded-full px-2.5 py-1", map[status] ?? "bg-parchment")}>{status}</span>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-charcoal/30 px-6 py-10 text-center">
      <p className="display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-moss-ink">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
