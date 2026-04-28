import type { ZodSchema, ZodError } from "zod";
import { getOpenAI, MODELS } from "../openai";

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; raw: string };

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export function parseStrict<T>(schema: ZodSchema<T>, raw: string): ValidationOutcome<T> {
  try {
    const json = tryParseJson(raw);
    const result = schema.safeParse(json);
    if (result.success) return { ok: true, value: result.data };
    return { ok: false, error: formatZodError(result.error), raw };
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${(e as Error).message}`, raw };
  }
}

function formatZodError(err: ZodError): string {
  return err.errors.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}

/**
 * Generates JSON output from the model and validates it against a Zod schema.
 * On validation failure, retries ONCE with the error message appended so the
 * model can self-correct. On second failure, returns an explicit error — no
 * silent fallback.
 */
export async function generateValidated<T>(args: {
  schema: ZodSchema<T>;
  systemPrompt: string;
  userMessage: string;
  model?: string;
  temperature?: number;
}): Promise<ValidationOutcome<T>> {
  const { schema, systemPrompt, userMessage, model = MODELS.GENERATION, temperature = 0.3 } = args;
  const client = getOpenAI();

  const firstResp = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  const firstRaw = firstResp.choices[0].message.content ?? "";
  const firstParsed = parseStrict(schema, firstRaw);
  if (firstParsed.ok) return firstParsed;

  // Retry once with explicit error feedback.
  const retryResp = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
      { role: "assistant", content: firstRaw },
      { role: "user", content: `Your previous response failed schema validation: ${firstParsed.error}\n\nReturn ONLY a corrected JSON object that matches the schema. No prose.` },
    ],
  });
  const retryRaw = retryResp.choices[0].message.content ?? "";
  const retryParsed = parseStrict(schema, retryRaw);
  if (retryParsed.ok) return retryParsed;

  return { ok: false, error: `Two attempts failed. Last error: ${retryParsed.error}`, raw: retryRaw };
}
