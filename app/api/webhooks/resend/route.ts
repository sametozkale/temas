import { NextResponse } from "next/server";

/** Resend delivery events are recorded in PHASE 8; ack immediately. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
