import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Profile } from "@/lib/types";
import { runChecklist } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";

const Body = z.object({
  profile: Profile,
  stage_id: z.enum(["hospital_bag", "nursery_setup", "first_month_essentials", "baby_proofing"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.errors }, { status: 400 });
  try {
    const result = await runChecklist(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
