import { getOpenAI, MODELS } from "../openai";
import { loadEmbeddings, loadKB, loadProducts } from "../data";
import type { KBEntry, Product, Profile } from "../types";

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

async function embedQuery(text: string): Promise<number[]> {
  const client = getOpenAI();
  const resp = await client.embeddings.create({ model: MODELS.EMBEDDING, input: text });
  return resp.data[0].embedding;
}

export type RetrievalResult = {
  kb: { entry: KBEntry; score: number }[];
  products: { product: Product; score: number }[];
};

function profileAgeMonths(profile: Profile): number | null {
  if (profile.stage === "baby" && profile.child_age_months !== null) return profile.child_age_months;
  if (profile.stage === "pregnancy" && profile.pregnancy_week !== null) {
    return -((40 - profile.pregnancy_week) / 4.345);
  }
  return null;
}

export async function retrieve(
  query: string,
  profile: Profile | null,
  opts: { topKKB?: number; topKProducts?: number; categoryFilter?: string; maxPriceAed?: number } = {},
): Promise<RetrievalResult> {
  const { topKKB = 3, topKProducts = 6, categoryFilter, maxPriceAed } = opts;
  const queryVec = await embedQuery(query);
  const embeddings = loadEmbeddings();

  const kbScores: { id: string; score: number }[] = [];
  const productScores: { id: string; score: number }[] = [];
  for (const r of embeddings.records) {
    const score = cosineSim(queryVec, r.embedding);
    if (r.kind === "kb") kbScores.push({ id: r.id, score });
    else productScores.push({ id: r.id, score });
  }

  const kbAll = loadKB();
  const productsAll = loadProducts();

  const ageMonths = profile ? profileAgeMonths(profile) : null;

  const kb = kbScores
    .sort((a, b) => b.score - a.score)
    .slice(0, topKKB * 2)
    .map((s) => ({ entry: kbAll.find((e) => e.id === s.id)!, score: s.score }))
    .filter((x) => x.entry)
    .slice(0, topKKB);

  const products = productScores
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ product: productsAll.find((p) => p.id === s.id)!, score: s.score }))
    .filter((x) => x.product)
    .filter((x) => {
      if (categoryFilter && x.product.category !== categoryFilter) return false;
      if (maxPriceAed !== undefined && x.product.price_aed > maxPriceAed) return false;
      if (ageMonths !== null) {
        if (x.product.age_range_max_months < ageMonths - 1 || x.product.age_range_min_months > ageMonths + 6) return false;
      }
      return true;
    })
    .slice(0, topKProducts);

  return { kb, products };
}
