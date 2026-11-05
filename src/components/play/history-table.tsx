import type { PlayerRef } from "@/engine/types";
import { Pencil } from "lucide-react";

export interface HistoryData {
  columns: { id: string; label: string }[];
  rows: { label: string; cells: Record<string, string> }[];
}

export function HistoryTable({ data, onCorrect, dark }: { data: HistoryData; players?: PlayerRef[]; onCorrect?: (rowIndex: number) => void; dark?: boolean }) {
  if (!data.rows.length) return <p className={dark ? "text-ivory/70" : "text-moss-ink"}>Nothing recorded yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">History</caption>
        <thead>
          <tr className={dark ? "border-b border-ivory/30" : "border-b-2 border-charcoal"}>
            <th scope="col" className="py-2 pr-4 font-bold">Entry</th>
            {data.columns.map((c) => <th key={c.id} scope="col" className="px-3 py-2 font-bold">{c.label}</th>)}
            {onCorrect && <th scope="col" className="py-2 pl-3"><span className="sr-only">Correct</span></th>}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className={dark ? "border-b border-ivory/15" : "border-b border-line"}>
              <th scope="row" className="whitespace-nowrap py-2 pr-4 font-semibold">{r.label}</th>
              {data.columns.map((c) => <td key={c.id} className="whitespace-nowrap px-3 py-2">{r.cells[c.id] ?? "–"}</td>)}
              {onCorrect && (
                <td className="py-1 pl-3 text-right">
                  <button onClick={() => onCorrect(i)} aria-label={`Correct ${r.label}`} className="inline-grid h-10 w-10 place-items-center hover:bg-ivory/10"><Pencil size={16} aria-hidden /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
