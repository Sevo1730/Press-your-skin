"use client";

import { CELL_COUNT, isWhammy } from "@/lib/gameLogic";

export default function PrizeEditor({
  text,
  onChange,
  onPush,
}: {
  text: string;
  onChange: (v: string) => void;
  onPush: () => void;
}) {
  const lines = text.split("\n").map((l) => l.trim());
  const filled = lines.filter(Boolean).length;
  const whammies = lines.filter(isWhammy).length;

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={18}
        spellCheck={false}
        className="w-full rounded-lg border-2 border-slate-700 bg-slate-900 p-3 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-amber-400"
        placeholder={`One prize per line, ${CELL_COUNT} lines.\nA line reading WHAMMY becomes a Whammy cell.`}
      />
      <div className="flex items-center gap-3 text-xs">
        <span className={filled === CELL_COUNT ? "text-emerald-400" : "text-amber-400"}>
          {filled}/{CELL_COUNT} prizes
        </span>
        <span className="text-red-400">{whammies} whammy</span>
        <button
          onClick={onPush}
          className="ml-auto rounded bg-amber-400 px-4 py-2 font-black uppercase text-black hover:bg-amber-300"
        >
          Push to board
        </button>
      </div>
    </div>
  );
}
