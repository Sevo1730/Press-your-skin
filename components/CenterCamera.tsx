"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomState } from "@/lib/useRoom";

/** Centre box: whose turn it is, the result banner, and an optional mirrored host cam. */
export default function CenterCamera({ state }: { state: RoomState }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!camOn) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch((e) => {
        setError(String(e?.message ?? e));
        setCamOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [camOn]);

  // stop the camera for good when the board unmounts
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const name = state.active ? state.players[state.active] : "";
  const result = state.result;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {camOn && (
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-80"
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
        {result ? (
          result.whammy ? (
            <>
              <div className="animate-whammy text-5xl font-black tracking-widest text-red-400 [text-shadow:0_0_20px_#f00] sm:text-7xl">
                WHAMMY!
              </div>
              <div className="text-sm font-bold uppercase text-red-200">No prize this time</div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold uppercase tracking-[.3em] text-amber-300">You got</div>
              <div className="animate-landed text-3xl font-black uppercase text-amber-200 [text-shadow:0_0_18px_rgba(251,191,36,.8)] sm:text-5xl">
                {result.prize || "—"}
              </div>
            </>
          )
        ) : (
          <>
            <div className="text-xs font-bold uppercase tracking-[.3em] text-amber-300">
              {state.phase === "spinning" || state.phase === "settling" ? "Spinning…" : `Round ${state.round}`}
            </div>
            <div className="text-2xl font-black uppercase text-white [text-shadow:0_2px_8px_#000] sm:text-4xl">
              {name || (state.active ? state.active : "Waiting for players")}
            </div>
            {name && state.active && (
              <div className="rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-black">{state.active}</div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setCamOn((v) => !v)}
        title={error || undefined}
        className="absolute bottom-1 right-1 z-20 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/70 opacity-30 transition hover:opacity-100"
      >
        {camOn ? "CAM OFF" : "CAM ON"}
      </button>
    </div>
  );
}
