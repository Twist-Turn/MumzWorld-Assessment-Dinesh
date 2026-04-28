import fs from "node:fs";
import path from "node:path";
import type { KBEntry, Product, Review } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

type EmbeddingFile = {
  model: string;
  dimension: number;
  records: { kind: "kb" | "product"; id: string; text: string; embedding: number[] }[];
};

let _kb: KBEntry[] | null = null;
let _products: Product[] | null = null;
let _reviews: Review[] | null = null;
let _embeddings: EmbeddingFile | null = null;

export function loadKB(): KBEntry[] {
  if (!_kb) _kb = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "knowledge_base.json"), "utf8"));
  return _kb!;
}

export function loadProducts(): Product[] {
  if (!_products) _products = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf8"));
  return _products!;
}

export function loadReviews(): Review[] {
  if (!_reviews) _reviews = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "reviews.json"), "utf8"));
  return _reviews!;
}

export function loadEmbeddings(): EmbeddingFile {
  if (!_embeddings) {
    const p = path.join(DATA_DIR, "embeddings.json");
    if (!fs.existsSync(p)) {
      throw new Error(`Embeddings file missing at ${p}. Run: npm run embed`);
    }
    _embeddings = JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return _embeddings!;
}

export function getKBById(id: string): KBEntry | null {
  return loadKB().find((e) => e.id === id) ?? null;
}

export function getProductById(id: string): Product | null {
  return loadProducts().find((p) => p.id === id) ?? null;
}

export function getReviewsByProductId(productId: string): Review[] {
  return loadReviews().filter((r) => r.product_id === productId);
}
