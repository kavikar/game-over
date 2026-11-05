import type { BoardProps } from "./game-ui";
import { PlayerToken } from "@/components/ui";

/** Ranked list used by any game that does not ship its own board. */
export function GenericBoard({ standings, players }: BoardProps) {
  return (
    <ol className="grid gap-px bg-ivory/15 sm:grid-cols-2">
      {standings.map((s) => {
        const p = players.find((x) => x.id === s.playerId)!;
        return (
          <li key={s.playerId} className="flex items-center gap-3 bg-forest px-3 py-3">
            <span className="num w-5 text-center text-sm font-bold text-brass">{s.rank}</span>
            <PlayerToken id={p.id} name={p.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-lg font-bold ${s.eliminated ? "line-through opacity-60" : ""}`}>{p.name}</p>
              {s.detail && <p className="truncate text-sm text-ivory/70">{s.detail}</p>}
            </div>
            <p className="num text-4xl font-extrabold">{s.display}</p>
          </li>
        );
      })}
    </ol>
  );
}
