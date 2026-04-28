import { NextRequest, NextResponse } from "next/server";
import { Profile } from "@/lib/types";
import { runVision } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const profileRaw = form.get("profile");
  const image = form.get("image");
  if (typeof profileRaw !== "string" || !(image instanceof File)) {
    return NextResponse.json({ error: "Expected multipart with 'profile' (JSON string) and 'image' (file)." }, { status: 400 });
  }
  const profile = Profile.safeParse(JSON.parse(profileRaw));
  if (!profile.success) return NextResponse.json({ error: "Invalid profile", details: profile.error.errors }, { status: 400 });
  try {
    const buf = Buffer.from(await image.arrayBuffer());
    const b64 = buf.toString("base64");
    const result = await runVision({ profile: profile.data, imageBase64: b64, mimeType: image.type || "image/jpeg" });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
