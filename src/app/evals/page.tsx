"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EvalReport, EvalScore } from "@/lib/types";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, FlaskConical, Loader2, Play, XCircle } from "lucide-react";

export default function EvalsPage() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/eval").then((r) => r.json()).then(setReport).catch((e) => setError((e as Error).message));
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch("/api/eval", { method: "POST" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      setReport(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge tone="brand"><FlaskConical size={12} />Eval rigor</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">Eval suite</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">Visible test coverage for groundedness, refusals, language quality, schema validity, tool use, voice, and vision.</p>
            </div>
            <Button onClick={run} disabled={running}>{running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}{running ? "Running..." : "Run all cases"}</Button>
          </div>
        </CardHeader>
        <CardBody>
          {error ? <div className="text-sm text-red-600 mb-3">{error}</div> : null}
          {!report || report.total_cases === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">No results yet. Click <strong>Run all cases</strong> to execute the suite. This calls the OpenAI API for each case and the LLM judges.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Pass rate</div>
                <div className="mt-2 text-3xl font-semibold text-zinc-950">{report.total_passed} / {report.total_cases}</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full bg-emerald-500" style={{ width: `${(report.total_passed / report.total_cases) * 100}%` }} />
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-500"><Clock size={15} />Last run</div>
                <div className="mt-2 break-all font-mono text-zinc-700">{report.generated_at_iso}</div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {report && report.scores.length > 0 ? (
        <div className="space-y-2">
          {report.scores.map((s) => <ScoreRow key={s.case_id} score={s} />)}
        </div>
      ) : null}
    </div>
  );
}

function ScoreRow({ score }: { score: EvalScore }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-xs text-zinc-500">{score.case_id}</div>
            <div className="text-sm font-medium truncate">{score.notes.split(" | ")[0] || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {score.groundedness !== null ? <Badge tone={score.groundedness >= 0.7 ? "success" : "warning"}>g {score.groundedness.toFixed(2)}</Badge> : null}
            {score.refusal_correctness !== null ? <Badge tone={score.refusal_correctness >= 0.7 ? "success" : "warning"}>r {score.refusal_correctness.toFixed(2)}</Badge> : null}
            {score.tool_use_appropriateness !== null ? <Badge tone={score.tool_use_appropriateness >= 0.7 ? "success" : "warning"}>t {score.tool_use_appropriateness.toFixed(2)}</Badge> : null}
            {score.language_quality !== null ? <Badge tone={score.language_quality >= 0.7 ? "success" : "warning"}>ar {score.language_quality.toFixed(2)}</Badge> : null}
            <Badge tone={score.passed ? "success" : "danger"}>{score.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}{score.passed ? "PASS" : "FAIL"}</Badge>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>
      {open ? (
        <div className="border-t border-zinc-100 p-4 space-y-2 text-xs">
          <div><span className="text-zinc-500">Notes:</span> {score.notes}</div>
          <details>
            <summary className="cursor-pointer text-zinc-600">Raw output</summary>
            <pre className="mt-2 overflow-x-auto bg-zinc-50 p-2 rounded text-xs">{JSON.stringify(score.raw_output, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </Card>
  );
}
