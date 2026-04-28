import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "src", "lib", "agent", "prompts");

const cache = new Map<string, string>();

export function loadPrompt(name: "classifier" | "brief_generator" | "voice_extractor" | "vision_safety" | "checklist_generator" | "chat_agent"): string {
  if (cache.has(name)) return cache.get(name)!;
  const text = fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
  cache.set(name, text);
  return text;
}
