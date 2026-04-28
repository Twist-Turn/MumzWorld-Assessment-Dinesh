import { ClassifierResult } from "../types";
import { MODELS } from "../openai";
import { loadPrompt } from "./prompts";
import { generateValidated } from "./validator";

export async function classify(message: string): Promise<ClassifierResult> {
  const result = await generateValidated({
    schema: ClassifierResult,
    systemPrompt: loadPrompt("classifier"),
    userMessage: `Classify this user message:\n\n"""\n${message}\n"""`,
    model: MODELS.CHEAP,
    temperature: 0,
  });

  if (!result.ok) {
    return {
      category: "ok",
      confidence: "low",
      language_detected: "en",
      reason_en: `Classifier validation failed (${result.error}); defaulting to ok.`,
    };
  }
  return result.value;
}
