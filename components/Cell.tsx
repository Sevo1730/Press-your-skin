"use client";

import { CELL_GRID, iconFor, isWhammy, paletteFor } from "@/lib/gameLogic";

const SKIN = {
  purple: "from-violet-600 to-fuchsia-800 border-violet-300",
  gold: "from-amber-400 to-orange-600 border-amber-200",
  teal: "from-teal-400 to-cyan-700 border-teal-200",
} as const;

export default function Cell({
  index,
  prize,
  lit,
  landed,
}: {
  index: number;
  prize: string;
  lit: boolean;
  landed: boolean;
}) {
  const { row, col } = CELL_GRID[index];
  const whammy = isWhammy(prize);
  const skin = whammy
    ? "from-red-600 to-red-900 border-red-300 animate-whammy"
    : SKIN[paletteFor(index)];

  return (
    <div
      style={{ gridRow: row, gridColumn: col }}
      className={[
        "relative flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-gradient-to-br p-1 text-center",
        "shadow-[inset_0_2px_0_rgba(255,255,255,.35),inset_0_-3px_6px_rgba(0,0,0,.45)] transition-[transform,filter] duration-75",
        skin,
        lit ? "z-10 scale-105 brightness-150 ring-4 ring-white" : "brightness-[.7]",
        landed ? "animate-landed" : "",
      ].join(" ")}
    >
      <span className="text-lg leading-none drop-shadow sm:text-2xl">{iconFor(index, prize)}</span>
      <span className="text-[9px] font-black uppercase leading-tight tracking-tight text-white [text-shadow:0_1px_2px_#000] sm:text-xs">
        {prize || "—"}
      </span>
    </div>
  );
}
