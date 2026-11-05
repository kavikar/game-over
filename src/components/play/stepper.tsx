"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function Stepper({
  value, onChange, min = 0, max = 9999, step = 1, label, size = "md", disabled, dark,
}: {
  value: number | null; onChange: (n: number) => void; min?: number; max?: number; step?: number;
  label: string; size?: "md" | "lg"; disabled?: boolean; dark?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn = cn("grid shrink-0 place-items-center border font-bold disabled:opacity-35", size === "lg" ? "h-14 w-14" : "h-11 w-11", dark ? "border-ivory/40 hover:bg-ivory/10" : "border-charcoal/40 hover:bg-parchment");
  return (
    <div className="inline-flex items-stretch" role="group" aria-label={label}>
      <button type="button" className={btn} disabled={disabled || (value ?? min) <= min} onClick={() => onChange(clamp((value ?? min) - step))} aria-label={`Decrease ${label}`}><Minus size={18} aria-hidden /></button>
      <input
        aria-label={label}
        inputMode="numeric"
        disabled={disabled}
        value={value === null ? "" : value}
        placeholder="–"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          if (raw === "") return;
          onChange(clamp(Number(raw)));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className={cn("num border-y bg-transparent text-center font-extrabold outline-none focus:bg-brass/20", size === "lg" ? "h-14 w-24 text-3xl" : "h-11 w-16 text-xl", dark ? "border-ivory/40" : "border-charcoal/40")}
      />
      <button type="button" className={btn} disabled={disabled || (value ?? min) >= max} onClick={() => onChange(clamp((value ?? min) + step))} aria-label={`Increase ${label}`}><Plus size={18} aria-hidden /></button>
    </div>
  );
}
