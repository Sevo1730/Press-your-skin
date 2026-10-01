"use client";

import { CELL_COUNT } from "@/lib/gameLogic";
import type { RoomState } from "@/lib/useRoom";
import Cell from "./Cell";

/**
 * The 18-cell ring on a 6x5 grid with the centre box spanning cols 2-5 / rows 2-4.
 * The ornate frame is pure CSS gradients — no image assets, no licensed art.
 */
export default function Board({
  state,
  children,
  className = "",
}: {
  state: RoomState;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] bg-[conic-gradient(from_0deg,#7a1414,#e3b23c,#7a1414,#f2d680,#7a1414,#e3b23c,#7a1414)] p-[6px] shadow-[0_0_60px_rgba(227,178,60,.35)] ${className}`}
    >
      <div className="rounded-[24px] bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 p-[3px]">
        <div className="rounded-[22px] bg-gradient-to-b from-red-800 via-red-950 to-red-900 p-3 shadow-[inset_0_0_40px_rgba(0,0,0,.8)]">
          <div className="grid aspect-[6/5] w-full grid-cols-6 grid-rows-5 gap-1.5 rounded-xl bg-black/60 p-1.5">
            {Array.from({ length: CELL_COUNT }, (_, i) => (
              <Cell
                key={i}
                index={i}
                prize={state.prizes[i] ?? ""}
                lit={state.lit === i}
                landed={state.phase === "result" && state.result?.cell === i}
              />
            ))}
            <div
              style={{ gridColumn: "2 / 6", gridRow: "2 / 5" }}
              className="relative overflow-hidden rounded-xl border-2 border-amber-300/70 bg-gradient-to-b from-slate-900 to-black shadow-[inset_0_0_30px_rgba(0,0,0,.9)]"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
