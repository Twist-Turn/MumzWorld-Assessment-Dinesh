import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getOpenAI, MODELS } from "../src/lib/openai";
import type { KBEntry, Product } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

type EmbeddingRecord = {
  kind: "kb" | "product";
  id: string;
  text: string;
  embedding: number[];
};

function buildKBText(entry: KBEntry): string {
  return [
    entry.title_en,
    entry.milestone_en,
    `Stage: ${entry.stage} ${entry.week_or_month}`,
    `Focus: ${entry.focus_areas.join(", ")}`,
  ].join("\n");
}

function buildProductText(p: Product): string {
  return [
    p.name_en,
    p.description_en,
    `Category: ${p.category}`,
    `Age range months: ${p.age_range_min_months} to ${p.age_range_max_months}`,
    p.safety_notes ? `Safety: ${p.safety_notes}` : "",
  ].filter(Boolean).join("\n");
}

async function embed(texts: string[]): Promise<number[][]> {
  const client = getOpenAI();
  const out: number[][] = [];
  const BATCH = 100;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const resp = await client.embeddings.create({
      model: MODELS.EMBEDDING,
      input: batch,
    });
    for (const item of resp.data) out.push(item.embedding);
  }
  return out;
}

async function main() {
  const kb: KBEntry[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "knowledge_base.json"), "utf8"));
  const products: Product[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf8"));

  console.log(`Embedding ${kb.length} KB entries and ${products.length} products...`);

  const kbTexts = kb.map(buildKBText);
  const productTexts = products.map(buildProductText);

  const kbEmbeddings = await embed(kbTexts);
  const productEmbeddings = await embed(productTexts);

  const records: EmbeddingRecord[] = [
    ...kb.map((e, i) => ({ kind: "kb" as const, id: e.id, text: kbTexts[i], embedding: kbEmbeddings[i] })),
    ...products.map((p, i) => ({ kind: "product" as const, id: p.id, text: productTexts[i], embedding: productEmbeddings[i] })),
  ];

  const outPath = path.join(DATA_DIR, "embeddings.json");
  fs.writeFileSync(outPath, JSON.stringify({ model: MODELS.EMBEDDING, dimension: records[0].embedding.length, records }, null, 0));
  console.log(`Wrote ${records.length} embeddings to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
