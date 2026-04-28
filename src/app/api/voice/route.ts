import { NextRequest, NextResponse } from "next/server";
import { Profile } from "@/lib/types";
import { runVoice } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const profileRaw = form.get("profile");
  const audio = form.get("audio");
  if (typeof profileRaw !== "string" || !(audio instanceof File)) {
    return NextResponse.json({ error: "Expected multipart with 'profile' (JSON string) and 'audio' (file)." }, { status: 400 });
  }
  const profile = Profile.safeParse(JSON.parse(profileRaw));
  if (!profile.success) return NextResponse.json({ error: "Invalid profile", details: profile.error.errors }, { status: 400 });
  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const result = await runVoice({ profile: profile.data, audioBuffer: buf, filename: audio.name || "memo.webm" });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
