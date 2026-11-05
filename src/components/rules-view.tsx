import type { RuleStatus, Verification } from "@/engine/types";
import { cn } from "@/lib/cn";

export function VerificationBadge({ v }: { v: Verification }) {
  const t = { verified: "Verified", partial: "Partly verified", unverified: "Unverified" }[v];
  return (
    <span className={cn("eyebrow inline-block border px-2 py-0.5", v === "verified" ? "border-forest text-forest" : v === "partial" ? "border-brass text-charcoal" : "border-clay-ink text-clay-ink")}>
      {t}
    </span>
  );
}

const LABEL: Record<RuleStatus, string> = {
  official: "Official rule",
  interpretation: "App interpretation",
  house: "House rule",
  unverified: "Unverified",
};

export function StatusTag({ s }: { s: RuleStatus }) {
  return (
    <span className={cn("eyebrow ml-2 whitespace-nowrap align-middle", s === "official" ? "text-forest" : s === "unverified" ? "text-clay-ink" : "text-moss-ink")}>
      {s === "official" ? "● " : s === "unverified" ? "▲ " : "○ "}
      {LABEL[s]}
    </span>
  );
}
