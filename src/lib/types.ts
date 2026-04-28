import { z } from "zod";

export const Language = z.enum(["en", "ar"]);
export type Language = z.infer<typeof Language>;

export const City = z.enum(["dubai", "abu_dhabi", "riyadh", "jeddah", "doha", "kuwait_city"]);
export type City = z.infer<typeof City>;

export const Currency = z.enum(["AED", "SAR", "QAR", "KWD"]);
export type Currency = z.infer<typeof Currency>;

export const Stage = z.enum(["pregnancy", "baby"]);
export type Stage = z.infer<typeof Stage>;

export const Profile = z.object({
  language: Language,
  city: City,
  currency: Currency,
  stage: Stage,
  pregnancy_week: z.number().int().min(1).max(42).nullable(),
  child_age_months: z.number().int().min(0).max(60).nullable(),
  due_date_iso: z.string().nullable(),
  child_dob_iso: z.string().nullable(),
});
export type Profile = z.infer<typeof Profile>;

export const Confidence = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof Confidence>;

export const Citation = z.object({
  kind: z.enum(["kb", "product", "review"]),
  id: z.string(),
  excerpt: z.string().max(200),
});

export const ProductRec = z.object({
  product_id: z.string(),
  reason_en: z.string(),
  reason_ar: z.string(),
  confidence: Confidence,
});

export const Refusal = z.object({
  type: z.enum(["medical", "out_of_scope", "insufficient_context", "unclear_input"]),
  message_en: z.string(),
  message_ar: z.string(),
});
export type Refusal = z.infer<typeof Refusal>;

export const BriefResponse = z.object({
  language: Language,
  week_or_month_label_en: z.string(),
  week_or_month_label_ar: z.string(),
  milestone_en: z.string(),
  milestone_ar: z.string(),
  product_recs: z.array(ProductRec).max(6),
  citations: z.array(Citation),
  refusal: Refusal.nullable(),
});
export type BriefResponse = z.infer<typeof BriefResponse>;

export const ChatToolCall = z.object({
  name: z.enum(["search_products", "lookup_milestone", "check_safety", "build_checklist"]),
  arguments: z.record(z.unknown()),
  result_summary: z.string(),
});

export const ChatResponse = z.object({
  language: Language,
  reply_text: z.string(),
  tool_calls: z.array(ChatToolCall),
  citations: z.array(Citation),
  product_recs: z.array(ProductRec).max(6),
  refusal: Refusal.nullable(),
});
export type ChatResponse = z.infer<typeof ChatResponse>;

export const ShoppingListItem = z.object({
  name_raw: z.string(),
  category: z.enum(["feeding", "sleep", "gear", "health", "clothing", "toys", "maternity", "other"]),
  matched_product_id: z.string().nullable(),
  confidence: Confidence,
  due_date_iso: z.string().nullable(),
});

export const ShoppingListResponse = z.object({
  language: Language,
  transcript: z.string(),
  items: z.array(ShoppingListItem),
  refusal: Refusal.nullable(),
});
export type ShoppingListResponse = z.infer<typeof ShoppingListResponse>;

export const SafetyCheckResponse = z.object({
  language: Language,
  recognized_item_en: z.string().nullable(),
  recognized_item_ar: z.string().nullable(),
  category: z.string().nullable(),
  age_appropriate: z.boolean().nullable(),
  verdict_en: z.string(),
  verdict_ar: z.string(),
  concerns: z.array(z.object({
    severity: z.enum(["low", "medium", "high"]),
    issue_en: z.string(),
    issue_ar: z.string(),
  })),
  confidence: Confidence,
  refusal: Refusal.nullable(),
});
export type SafetyCheckResponse = z.infer<typeof SafetyCheckResponse>;

export const ChecklistItem = z.object({
  id: z.string(),
  title_en: z.string(),
  title_ar: z.string(),
  why_now_en: z.string(),
  why_now_ar: z.string(),
  linked_product_id: z.string().nullable(),
  citation_kb_id: z.string().nullable(),
});

export const ChecklistResponse = z.object({
  stage_id: z.string(),
  language: Language,
  title_en: z.string(),
  title_ar: z.string(),
  items: z.array(ChecklistItem),
  refusal: Refusal.nullable(),
});
export type ChecklistResponse = z.infer<typeof ChecklistResponse>;

export const ClassifierResult = z.object({
  category: z.enum(["medical", "out_of_scope", "ok"]),
  confidence: Confidence,
  language_detected: Language,
  reason_en: z.string(),
});
export type ClassifierResult = z.infer<typeof ClassifierResult>;

export const KBEntry = z.object({
  id: z.string(),
  stage: Stage,
  week_or_month: z.number().int(),
  title_en: z.string(),
  title_ar: z.string(),
  milestone_en: z.string(),
  milestone_ar: z.string(),
  focus_areas: z.array(z.string()),
  source_attribution: z.string(),
});
export type KBEntry = z.infer<typeof KBEntry>;

export const Product = z.object({
  id: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  description_en: z.string(),
  description_ar: z.string(),
  category: z.enum(["feeding", "sleep", "gear", "health", "clothing", "toys", "maternity", "other"]),
  age_range_min_months: z.number().int(),
  age_range_max_months: z.number().int(),
  price_aed: z.number(),
  image_url: z.string().nullable(),
  safety_notes: z.string().nullable(),
});
export type Product = z.infer<typeof Product>;

export const Review = z.object({
  id: z.string(),
  product_id: z.string(),
  rating: z.number().int().min(1).max(5),
  text_en: z.string(),
  text_ar: z.string().nullable(),
  author_persona: z.string(),
});
export type Review = z.infer<typeof Review>;

export const EvalCase = z.object({
  id: z.string(),
  category: z.enum([
    "easy",
    "multilingual_ar",
    "adversarial_groundedness",
    "adversarial_medical",
    "adversarial_oos",
    "voice_transcription",
    "vision_safety",
  ]),
  description: z.string(),
  endpoint: z.enum(["brief", "chat", "voice", "vision", "checklist"]),
  input: z.record(z.unknown()),
  expected_behavior: z.string(),
  expected_refusal_type: Refusal.shape.type.nullable().optional(),
});
export type EvalCase = z.infer<typeof EvalCase>;

export const EvalScore = z.object({
  case_id: z.string(),
  groundedness: z.number().min(0).max(1).nullable(),
  language_quality: z.number().min(0).max(1).nullable(),
  refusal_correctness: z.number().min(0).max(1).nullable(),
  schema_validity: z.number().min(0).max(1),
  tool_use_appropriateness: z.number().min(0).max(1).nullable(),
  passed: z.boolean(),
  notes: z.string(),
  raw_output: z.unknown(),
});
export type EvalScore = z.infer<typeof EvalScore>;

export const EvalReport = z.object({
  generated_at_iso: z.string(),
  total_cases: z.number().int(),
  total_passed: z.number().int(),
  scores: z.array(EvalScore),
});
export type EvalReport = z.infer<typeof EvalReport>;

export function cityToCurrency(city: City): Currency {
  if (city === "dubai" || city === "abu_dhabi") return "AED";
  if (city === "riyadh" || city === "jeddah") return "SAR";
  if (city === "doha") return "QAR";
  return "KWD";
}
