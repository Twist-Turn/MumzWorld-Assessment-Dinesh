import { NextRequest, NextResponse } from "next/server";
import { runEvalSuite } from "@/../evals/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  // Return last results if present.
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const p = path.join(process.cwd(), "evals", "results.json");
    if (!fs.existsSync(p)) return NextResponse.json({ generated_at_iso: null, total_cases: 0, total_passed: 0, scores: [] });
    const raw = fs.readFileSync(p, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const report = await runEvalSuite();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
