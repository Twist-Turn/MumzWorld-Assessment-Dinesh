import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Add it to .env or your shell environment.");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const MODELS = {
  GENERATION: "gpt-4o",
  CHEAP: "gpt-4o-mini",
  VISION: "gpt-4o",
  WHISPER: "whisper-1",
  EMBEDDING: "text-embedding-3-small",
} as const;
