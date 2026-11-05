import type { Session } from "@/engine/types";

const LABEL: Record<string, string> = {
  created: "Session created", action: "Entry recorded", correct: "Entry corrected", undo: "Entry undone",
  pause: "Paused", resume: "Resumed", complete: "Completed", reopen: "Reopened", cancel: "Cancelled",
};

export function AuditLog({ session }: { session: Session }) {
  return (
    <details className="group border-t border-line py-3">
      <summary className="cursor-pointer text-sm font-bold">Audit trail <span className="num font-normal text-moss-ink">({session.events.length} events · rules {session.rulesVersion})</span></summary>
      <ol className="num mt-3 space-y-1 text-sm">
        {session.events.map((e) => (
          <li key={e.id} className="flex gap-3">
            <span className="w-6 text-right text-moss-ink">{e.seq}</span>
            <span className="w-40 shrink-0 text-moss-ink">{new Date(e.at).toLocaleString()}</span>
            <span>{LABEL[e.type]}{e.note ? ` — ${e.note}` : ""}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
