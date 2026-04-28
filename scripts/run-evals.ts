import "dotenv/config";
import { runEvalSuite } from "../evals/runner";

(async () => {
  const report = await runEvalSuite();
  console.log(`\n${report.total_passed}/${report.total_cases} cases passed.`);
  console.log(`Wrote evals/results.json (timestamp ${report.generated_at_iso}).`);
  if (report.total_passed !== report.total_cases) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });
