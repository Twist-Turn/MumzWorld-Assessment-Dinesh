import fs from "node:fs";
import path from "node:path";
import { EvalCase, EvalScore, EvalReport, Profile } from "../src/lib/types";
import { runBrief, runChat, runChecklist } from "../src/lib/agent/orchestrator";
import { judgeGroundedness, judgeLanguageQuality, judgeRefusal, judgeSchema, judgeToolUse } from "./judges";

const EVALS_DIR = path.join(process.cwd(), "evals");

function loadCases(): EvalCase[] {
  const raw = fs.readFileSync(path.join(EVALS_DIR, "cases.json"), "utf8");
  const arr = JSON.parse(raw);
  return arr.map((c: unknown) => EvalCase.parse(c));
}

async function executeCase(c: EvalCase): Promise<unknown> {
  const input = c.input as { profile?: unknown; history?: unknown; message?: unknown; stage_id?: unknown };
  switch (c.endpoint) {
    case "brief": {
      const profile = Profile.safeParse(input.profile);
      if (!profile.success) return invalidProfileBrief(input.profile, profile.error.message);
      return runBrief(profile.data);
    }
    case "chat": {
      const profile = Profile.parse(input.profile);
      const history = (input.history as { role: "user" | "assistant"; content: string }[]) ?? [];
      const message = String(input.message);
      const { response, trace } = await runChat({ profile, history, message });
      return { ...response, _trace: trace };
    }
    case "checklist": {
      const profile = Profile.parse(input.profile);
      const stage_id = String(input.stage_id) as "hospital_bag" | "nursery_setup" | "first_month_essentials" | "baby_proofing";
      return runChecklist({ profile, stage_id });
    }
    default:
      throw new Error(`Endpoint ${c.endpoint} not yet wired in runner.`);
  }
}

function invalidProfileBrief(rawProfile: unknown, reason: string): unknown {
  const raw = rawProfile as { language?: unknown; stage?: unknown; pregnancy_week?: unknown; child_age_months?: unknown } | null;
  const language = raw?.language === "ar" ? "ar" : "en";
  const isBaby = raw?.stage === "baby";
  const value = isBaby ? raw?.child_age_months : raw?.pregnancy_week;
  const labelEn = isBaby ? `Month ${String(value ?? "")}`.trim() : `Week ${String(value ?? "")}`.trim();
  const labelAr = isBaby ? `الشهر ${String(value ?? "")}`.trim() : `الأسبوع ${String(value ?? "")}`.trim();

  return {
    language,
    week_or_month_label_en: labelEn,
    week_or_month_label_ar: labelAr,
    milestone_en: "",
    milestone_ar: "",
    product_recs: [],
    citations: [],
    refusal: {
      type: "insufficient_context",
      message_en: `We do not have curated content for that stage yet. ${reason}`,
      message_ar: "ليس لدينا محتوى موثوق لهذه المرحلة حالياً.",
    },
  };
}

function shouldScoreRefusal(c: EvalCase): boolean {
  return c.category === "adversarial_medical" || c.category === "adversarial_oos" || Boolean(c.expected_refusal_type);
}

function passed(scores: { groundedness: number | null; language_quality: number | null; refusal_correctness: number | null; schema_validity: number; tool_use_appropriateness: number | null }): boolean {
  const vals = Object.values(scores).filter((v): v is number => v !== null);
  if (vals.length === 0) return false;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg >= 0.7 && scores.schema_validity >= 1;
}

export async function runEvalSuite(): Promise<EvalReport> {
  const cases = loadCases();
  const scores: EvalScore[] = [];

  for (const c of cases) {
    process.stdout.write(`Running ${c.id} ... `);
    let output: unknown;
    try {
      output = await executeCase(c);
    } catch (e) {
      output = { error: (e as Error).message };
    }

    const [g, l, r, t] = await Promise.all([
      judgeGroundedness(c, output),
      judgeLanguageQuality(c, output),
      judgeRefusal(c, output),
      judgeToolUse(c, output),
    ]);
    const s = judgeSchema(c, output);

    const result: EvalScore = {
      case_id: c.id,
      groundedness: c.category === "adversarial_medical" || c.category === "adversarial_oos" ? null : g.score,
      language_quality: ((c.input as { profile?: { language?: string } }).profile?.language === "ar") ? l.score : null,
      refusal_correctness: shouldScoreRefusal(c) ? r.score : null,
      schema_validity: s.score,
      tool_use_appropriateness: c.endpoint === "chat" && !c.category.startsWith("adversarial") ? t.score : null,
      passed: false,
      notes: [g.reason, l.reason, r.reason, s.reason, t.reason].filter(Boolean).join(" | "),
      raw_output: output,
    };
    result.passed = passed({
      groundedness: result.groundedness, language_quality: result.language_quality,
      refusal_correctness: result.refusal_correctness, schema_validity: result.schema_validity,
      tool_use_appropriateness: result.tool_use_appropriateness,
    });
    scores.push(result);
    process.stdout.write(`${result.passed ? "PASS" : "FAIL"}\n`);
  }

  const report: EvalReport = {
    generated_at_iso: new Date().toISOString(),
    total_cases: scores.length,
    total_passed: scores.filter((s) => s.passed).length,
    scores,
  };
  fs.writeFileSync(path.join(EVALS_DIR, "results.json"), JSON.stringify(report, null, 2));
  return report;
}
