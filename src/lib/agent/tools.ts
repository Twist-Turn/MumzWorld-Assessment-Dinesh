import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { loadKB, loadProducts, getProductById } from "../data";
import type { Profile, Product, KBEntry } from "../types";

export const SearchProductsArgs = z.object({
  age_months: z.number().int().nullable().default(null),
  category: z.enum(["feeding", "sleep", "gear", "health", "clothing", "toys", "maternity", "other"]).nullable().default(null),
  max_price_aed: z.number().nullable().default(null),
  query: z.string().nullable().default(null),
});

export const LookupMilestoneArgs = z.object({
  stage: z.enum(["pregnancy", "baby"]),
  week_or_month: z.number().int(),
});

export const CheckSafetyArgs = z.object({
  product_id: z.string(),
  child_age_months: z.number().int().nullable(),
});

export const BuildChecklistArgs = z.object({
  stage_id: z.enum(["hospital_bag", "nursery_setup", "first_month_essentials", "baby_proofing"]),
});

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search the product catalog by age, category, max price, or text query. Returns a ranked list of matching products with id, name, description, price, and age range.",
      parameters: {
        type: "object",
        properties: {
          age_months: { type: ["integer", "null"], description: "Child's age in months. Use 0 for newborn, negative for pregnancy weeks (-1 = ~36w, etc), or null to skip age filter." },
          category: { type: ["string", "null"], enum: ["feeding", "sleep", "gear", "health", "clothing", "toys", "maternity", "other", null] },
          max_price_aed: { type: ["number", "null"], description: "Maximum price in AED, or null." },
          query: { type: ["string", "null"], description: "Optional text query to filter by name/description match." },
        },
        required: ["age_months", "category", "max_price_aed", "query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_milestone",
      description: "Look up the curated milestone/KB entry for a given pregnancy week or baby month.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", enum: ["pregnancy", "baby"] },
          week_or_month: { type: "integer", description: "Week (1-42) for pregnancy, or month (0-60) for baby." },
        },
        required: ["stage", "week_or_month"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_safety",
      description: "Check whether a specific product is age-appropriate for a child, and return any safety notes.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          child_age_months: { type: ["integer", "null"] },
        },
        required: ["product_id", "child_age_months"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_checklist",
      description: "Generate a curated stage checklist (hospital bag, nursery setup, first month essentials, baby-proofing).",
      parameters: {
        type: "object",
        properties: {
          stage_id: { type: "string", enum: ["hospital_bag", "nursery_setup", "first_month_essentials", "baby_proofing"] },
        },
        required: ["stage_id"],
        additionalProperties: false,
      },
    },
  },
];

export type ToolResult = {
  ok: boolean;
  summary: string;
  data: unknown;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTerms(query: string | null): string[] {
  if (!query) return [];
  const normalized = normalizeText(query);
  const terms = new Set(normalized.split(/\s+/).filter((t) => t.length > 1));

  const aliases: Record<string, string[]> = {
    diaper: ["diapers", "nappy", "nappies"],
    diapers: ["diaper", "nappy", "nappies"],
    bottle: ["bottles", "anti colic"],
    bottles: ["bottle", "anti colic"],
    thermometer: ["forehead", "temperature"],
    swaddle: ["swaddles", "muslin"],
    swaddles: ["swaddle", "muslin"],
    car: ["car seat", "rear facing", "infant car seat"],
    seat: ["car seat", "rear facing", "infant car seat"],
    stroller: ["travel system"],
    marble: ["marble run", "marbles"],
    toy: ["toys"],
    high: ["high chair"],
    chair: ["high chair"],
    food: ["first foods", "bowl", "spoon"],
    foods: ["first foods", "bowl", "spoon"],
  };

  for (const term of Array.from(terms)) {
    for (const alias of aliases[term] ?? []) terms.add(alias);
  }
  return Array.from(terms);
}

function productText(product: Product): string {
  return normalizeText([
    product.id,
    product.name_en,
    product.name_ar,
    product.description_en,
    product.description_ar,
    product.category,
    product.safety_notes ?? "",
  ].join(" "));
}

function productSearchScore(product: Product, args: z.infer<typeof SearchProductsArgs>): number {
  let score = 0;
  const text = productText(product);
  const terms = queryTerms(args.query);

  if (args.category) score += product.category === args.category ? 4 : -1;
  if (args.age_months !== null) {
    const age = args.age_months;
    if (age >= product.age_range_min_months - 1 && age <= product.age_range_max_months + 6) score += 2;
    else score -= 2;
  }
  if (args.max_price_aed !== null) score += product.price_aed <= args.max_price_aed ? 1 : -0.5;

  if (args.query) {
    const normalizedQuery = normalizeText(args.query);
    if (text.includes(normalizedQuery)) score += 8;
    for (const term of terms) {
      if (text.includes(normalizeText(term))) score += term.includes(" ") ? 4 : 2;
    }
  }

  return score;
}

function serializeProduct(p: Product, maxPriceAed: number | null) {
  return {
    id: p.id, name_en: p.name_en, name_ar: p.name_ar, category: p.category,
    age_range_min_months: p.age_range_min_months, age_range_max_months: p.age_range_max_months,
    price_aed: p.price_aed, within_budget: maxPriceAed === null ? null : p.price_aed <= maxPriceAed,
    description_en: p.description_en, safety_notes: p.safety_notes,
  };
}

function findBestProductMatch(raw: string): Product | null {
  const query = raw.replace(/^prod_/, "").replace(/_/g, " ");
  const args = SearchProductsArgs.parse({ query });
  const matches = loadProducts()
    .map((product) => ({ product, score: productSearchScore(product, args) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return matches[0]?.product ?? null;
}

function searchProducts(args: z.infer<typeof SearchProductsArgs>): ToolResult {
  const all = loadProducts();
  const hasQuery = Boolean(args.query?.trim());
  const ranked = all
    .map((product) => ({ product, score: productSearchScore(product, args) }))
    .filter((x) => {
      if (!hasQuery && args.category && x.product.category !== args.category) return false;
      if (!hasQuery && args.max_price_aed !== null && x.product.price_aed > args.max_price_aed) return false;
      return hasQuery ? x.score > 0 : x.score >= 0;
    })
    .sort((a, b) => b.score - a.score || a.product.price_aed - b.product.price_aed);

  const results = ranked.slice(0, 8).map((x) => x.product);
  const inBudgetCount = args.max_price_aed === null ? results.length : results.filter((p) => p.price_aed <= args.max_price_aed!).length;
  const overBudgetCount = args.max_price_aed === null ? 0 : results.length - inBudgetCount;

  const budgetSummary = args.max_price_aed === null
    ? ""
    : ` ${inBudgetCount} within budget${overBudgetCount ? `; ${overBudgetCount} matching catalog item(s) exceed ${args.max_price_aed} AED` : ""}.`;

  return {
    ok: true,
    summary: `Found ${results.length} product(s).${budgetSummary}`,
    data: results.map((p) => serializeProduct(p, args.max_price_aed)),
  };
}

function lookupMilestone(args: z.infer<typeof LookupMilestoneArgs>): ToolResult {
  const kb = loadKB();
  const exact = kb.find((e) => e.stage === args.stage && e.week_or_month === args.week_or_month);
  if (exact) return { ok: true, summary: `Found exact match: ${exact.id}`, data: exact };
  const stageEntries = kb.filter((e) => e.stage === args.stage);
  if (stageEntries.length === 0) return { ok: false, summary: `No KB entries for stage ${args.stage}.`, data: null };
  let nearest: KBEntry = stageEntries[0];
  let best = Math.abs(nearest.week_or_month - args.week_or_month);
  for (const e of stageEntries) {
    const d = Math.abs(e.week_or_month - args.week_or_month);
    if (d < best || (d === best && e.week_or_month > args.week_or_month && nearest.week_or_month < args.week_or_month)) {
      best = d;
      nearest = e;
    }
  }
  return { ok: true, summary: `No exact match; nearest entry is ${nearest.id} at ${nearest.week_or_month}.`, data: nearest };
}

function checkSafety(args: z.infer<typeof CheckSafetyArgs>): ToolResult {
  const product = getProductById(args.product_id) ?? findBestProductMatch(args.product_id);
  if (!product) return { ok: false, summary: `Unknown product_id: ${args.product_id}.`, data: null };
  const age = args.child_age_months;
  if (age === null) {
    return {
      ok: true,
      summary: `Cannot evaluate age fit without child_age_months. Returning safety notes only.`,
      data: { product_id: product.id, age_appropriate: null, safety_notes: product.safety_notes, age_range: [product.age_range_min_months, product.age_range_max_months] },
    };
  }
  const inRange = age >= product.age_range_min_months && age <= product.age_range_max_months;
  return {
    ok: true,
    summary: inRange ? `Age-appropriate: yes.` : `Age-appropriate: no (child is ${age}m, product is for ${product.age_range_min_months}–${product.age_range_max_months}m).`,
    data: { product_id: product.id, age_appropriate: inRange, child_age_months: age, age_range: [product.age_range_min_months, product.age_range_max_months], safety_notes: product.safety_notes },
  };
}

function buildChecklist(args: z.infer<typeof BuildChecklistArgs>): ToolResult {
  // Returns a starter set of curated items. The chat agent uses this as a hint;
  // the proper /api/checklist endpoint generates a richer KB-grounded list.
  const seed: Record<string, string[]> = {
    hospital_bag: [
      "ID and hospital paperwork", "Pre-packed maternity hospital bag (prod_hospital_bag)",
      "Going-home outfit for baby", "Newborn diapers (prod_diaper_pack_nb)",
      "Phone charger", "Snacks and water for partner",
    ],
    nursery_setup: [
      "Bassinet (prod_bassinet)", "Firm crib mattress (prod_crib_mattress)",
      "Sleep sack (prod_sleep_sack)", "Baby monitor (prod_baby_monitor)",
      "Diaper changing area",
    ],
    first_month_essentials: [
      "Newborn diapers (prod_diaper_pack_nb)", "Diaper rash cream (prod_diaper_cream)",
      "Bottles + sterilizer (prod_bottles_set, prod_bottle_sterilizer)",
      "Swaddles (prod_swaddle_pack)", "Forehead thermometer (prod_baby_thermometer)",
    ],
    baby_proofing: [
      "Outlet covers (prod_outlet_covers)", "Cabinet locks (prod_cabinet_locks)",
      "Stair gate (prod_stair_gate)", "Anchor heavy furniture",
      "Set water heater to 49°C max",
    ],
  };
  return { ok: true, summary: `Returned ${seed[args.stage_id].length} starter items for ${args.stage_id}.`, data: seed[args.stage_id] };
}

export function executeTool(name: string, rawArgs: unknown): ToolResult {
  try {
    switch (name) {
      case "search_products":   return searchProducts(SearchProductsArgs.parse(rawArgs));
      case "lookup_milestone":  return lookupMilestone(LookupMilestoneArgs.parse(rawArgs));
      case "check_safety":      return checkSafety(CheckSafetyArgs.parse(rawArgs));
      case "build_checklist":   return buildChecklist(BuildChecklistArgs.parse(rawArgs));
      default:                  return { ok: false, summary: `Unknown tool: ${name}.`, data: null };
    }
  } catch (e) {
    return { ok: false, summary: `Tool argument validation failed: ${(e as Error).message}`, data: null };
  }
}
