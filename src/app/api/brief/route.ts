import { NextRequest, NextResponse } from "next/server";
import { Profile } from "@/lib/types";
import { runBrief } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const profile = Profile.safeParse(body.profile);
  if (!profile.success) return NextResponse.json({ error: "Invalid profile", details: profile.error.errors }, { status: 400 });
  try {
    const result = await runBrief(profile.data);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
