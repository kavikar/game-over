import type { GameMeta } from "@/engine/types";

/**
 * Original placeholder cover art, generated from each game's palette.
 * No publisher artwork is used. Replace with licensed art when available.
 */
export function GameCover({ meta, className = "" }: { meta: GameMeta; className?: string }) {
  const { bg, fg, accent, motif } = meta.cover;
  return (
    <svg viewBox="0 0 300 400" role="img" aria-label={`${meta.name} cover (placeholder art)`} className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="400" fill={bg} />
      <rect x="14" y="14" width="272" height="372" fill="none" stroke={fg} strokeOpacity=".35" strokeWidth="1" />
      {motif === "phases" && (
        <g>
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={36 + i * 23} y={250 - i * 16} width="17" height={36 + i * 16} fill={i === 9 ? accent : fg} fillOpacity={i === 9 ? 1 : 0.16 + i * 0.05} />
          ))}
          <text x="150" y="130" textAnchor="middle" fontSize="92" fill={fg} fontFamily="var(--font-display)">10</text>
        </g>
      )}
      {motif === "cards" && (
        <g transform="translate(150 215)">
          {[-24, -8, 8, 24].map((r, i) => (
            <g key={r} transform={`rotate(${r}) translate(-46 -78)`}>
              <rect width="92" height="140" rx="8" fill={i === 3 ? fg : i === 2 ? accent : bg} stroke={fg} strokeWidth="2" />
              {i === 3 && <text x="46" y="88" textAnchor="middle" fontSize="44" fill={bg} fontFamily="var(--font-display)">1</text>}
            </g>
          ))}
        </g>
      )}
      {motif === "routes" && (
        <g stroke={fg} fill="none" strokeWidth="3">
          <path d="M44 300 L110 230 L170 262 L250 150" strokeDasharray="14 7" />
          <path d="M44 170 L110 230 M170 262 L130 340" strokeDasharray="14 7" strokeOpacity=".5" />
          {[[44, 300], [110, 230], [170, 262], [250, 150], [44, 170], [130, 340]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill={i === 3 ? accent : bg} />
          ))}
        </g>
      )}
      {motif === "pile" && (
        <g>
          <text x="150" y="250" textAnchor="middle" fontSize="170" fill={fg} fontFamily="var(--font-display)">99</text>
          <rect x="60" y="270" width="180" height="6" fill={accent} />
        </g>
      )}
      {motif === "chips" && (
        <g fill="none" stroke={fg}>
          {[[110, 250, 56], [180, 215, 56], [150, 150, 56]].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={i === 1 ? accent : bg} strokeWidth="3" />
              <circle cx={x} cy={y} r={r! - 12} strokeDasharray="6 8" strokeWidth="3" />
            </g>
          ))}
        </g>
      )}
      <text x="150" y="352" textAnchor="middle" fontSize="30" fill={fg} fontFamily="var(--font-display)">{meta.name}</text>
    </svg>
  );
}
