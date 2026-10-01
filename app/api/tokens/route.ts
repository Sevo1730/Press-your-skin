import { NextResponse } from "next/server";
import { SLOTS, type Slot } from "@/lib/gameLogic";
import { tokens } from "@/lib/tokenStore";

export const dynamic = "force-dynamic";

/** The bot registers player links here. Shared secret keeps randoms off the endpoint. */
export async function POST(req: Request) {
  if (req.headers.get("x-bot-secret") !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { token, slot, round, user } = body ?? {};
  if (typeof token !== "string" || token.length < 8 || !SLOTS.includes(slot) || typeof round !== "number") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  tokens.set(token, { slot: slot as Slot, round, user: String(user ?? "") });
  tokens.clearRound(round); // drop last round's links
  return NextResponse.json({ ok: true });
}

/** The /play page asks which slot a token belongs to. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const entry = tokens.get(token);
  if (!entry) return NextResponse.json({ error: "invalid or expired token" }, { status: 404 });
  return NextResponse.json(entry);
}
