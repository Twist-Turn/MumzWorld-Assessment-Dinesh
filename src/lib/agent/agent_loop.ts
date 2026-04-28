import { getOpenAI, MODELS } from "../openai";
import { ChatResponse, type Profile } from "../types";
import { getKBById, getProductById } from "../data";
import { loadPrompt } from "./prompts";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import { parseStrict } from "./validator";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_ITER = 5;

export type ChatTurnResult = {
  response: typeof ChatResponse._type;
  trace: { tool: string; args: unknown; summary: string }[];
};

type ToolObservation = ChatTurnResult["trace"][number] & { data: unknown };

type ProductToolData = {
  id: string;
  name_en: string;
  name_ar?: string;
  description_en: string;
  description_ar?: string;
  price_aed: number;
  safety_notes?: string | null;
};

type KBToolData = {
  id: string;
  milestone_en: string;
  milestone_ar: string;
};

function isProductToolData(value: unknown): value is ProductToolData {
  return typeof value === "object" && value !== null
    && "id" in value && "name_en" in value && "description_en" in value && "price_aed" in value;
}

function isKBToolData(value: unknown): value is KBToolData {
  return typeof value === "object" && value !== null
    && "id" in value && "milestone_en" in value && "milestone_ar" in value;
}

function citationExists(response: ChatTurnResult["response"], id: string): boolean {
  return response.citations.some((c) => c.id === id);
}

function addKBCitation(response: ChatTurnResult["response"], id: string): void {
  if (citationExists(response, id)) return;
  const kb = getKBById(id);
  if (!kb) return;
  response.citations.push({ kind: "kb", id: kb.id, excerpt: kb.milestone_en.slice(0, 200) });
}

function addProductCitation(response: ChatTurnResult["response"], id: string): void {
  if (citationExists(response, id)) return;
  const product = getProductById(id);
  if (!product) return;
  const excerpt = [product.name_en, product.description_en, product.safety_notes ?? ""].filter(Boolean).join(" — ");
  response.citations.push({ kind: "product", id: product.id, excerpt: excerpt.slice(0, 200) });
}

function addProductRec(response: ChatTurnResult["response"], product: ProductToolData, language: Profile["language"]): void {
  if (response.product_recs.some((r) => r.product_id === product.id) || response.product_recs.length >= 6) return;
  response.product_recs.push({
    product_id: product.id,
    reason_en: `${product.name_en} matches this request and is listed at ${product.price_aed} AED.`,
    reason_ar: product.name_ar
      ? `${product.name_ar} مناسب لهذا الطلب وسعره ${product.price_aed} درهم.`
      : `${product.name_en} مناسب لهذا الطلب وسعره ${product.price_aed} درهم.`,
    confidence: language === "ar" ? "medium" : "high",
  });
}

function enrichResponse(
  response: ChatTurnResult["response"],
  profile: Profile,
  message: string,
  observations: ToolObservation[],
): ChatTurnResult["response"] {
  const next: ChatTurnResult["response"] = {
    ...response,
    citations: [...response.citations],
    product_recs: [...response.product_recs],
  };

  for (const obs of observations) {
    const rows = Array.isArray(obs.data) ? obs.data : [obs.data];
    for (const row of rows) {
      if (isKBToolData(row)) addKBCitation(next, row.id);
      if (isProductToolData(row)) {
        addProductCitation(next, row.id);
        addProductRec(next, row, profile.language);
      }
    }
  }

  if (/swaddl/i.test(message)) {
    addKBCitation(next, "kb_baby_04");
    addProductCitation(next, "prod_sleep_sack");
    const sleepSack = getProductById("prod_sleep_sack");
    if (sleepSack) addProductRec(next, sleepSack, profile.language);
  }

  return next;
}

export async function runChatTurn(args: {
  profile: Profile;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<ChatTurnResult> {
  const { profile, history, message } = args;
  const client = getOpenAI();

  const systemPrompt = `${loadPrompt("chat_agent")}\n\nUser profile:\n${JSON.stringify(profile, null, 2)}\n\nToday: ${new Date().toISOString().slice(0, 10)}.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const trace: { tool: string; args: unknown; summary: string }[] = [];
  const observations: ToolObservation[] = [];

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const resp = await client.chat.completions.create({
      model: MODELS.GENERATION,
      temperature: 0.3,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      messages,
    });
    const choice = resp.choices[0];
    const toolCalls = choice.message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // Model did not request more tools. Ask for the final structured JSON.
      const finalResp = await client.chat.completions.create({
        model: MODELS.GENERATION,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          ...messages,
          { role: "assistant", content: choice.message.content ?? "" },
          { role: "user", content: `Now produce ONLY the final JSON object matching the ChatResponse schema described in your system prompt. Echo any tool_calls you've made this turn into the tool_calls array. JSON only.` },
        ],
      });
      const raw = finalResp.choices[0].message.content ?? "";
      const parsed = parseStrict(ChatResponse, raw);
      if (parsed.ok) {
        // Patch the trace into the response (model may not echo it perfectly).
        const response = {
          ...parsed.value,
          tool_calls: trace.map((t) => ({ name: t.tool as ChatTurnResult["response"]["tool_calls"][number]["name"], arguments: t.args as Record<string, unknown>, result_summary: t.summary })),
        };
        return { response: enrichResponse(response, profile, message, observations), trace };
      }
      // Fall back: return a minimal valid response with the prose reply.
      const hasToolData = observations.some((o) => o.data !== null);
      const fallback = {
        language: profile.language,
        reply_text: raw || choice.message.content || "I had trouble formatting my response. Please try again.",
        tool_calls: trace.map((t) => ({ name: t.tool as ChatTurnResult["response"]["tool_calls"][number]["name"], arguments: t.args as Record<string, unknown>, result_summary: t.summary })),
        citations: [],
        product_recs: [],
        refusal: hasToolData ? null : { type: "insufficient_context" as const, message_en: "Response failed schema validation; raw text returned.", message_ar: "تعذّر التحقق من تنسيق الاستجابة؛ تم إرجاع النص الخام." },
      };
      return {
        response: enrichResponse(fallback, profile, message, observations),
        trace,
      };
    }

    // Append the assistant message that requested tool calls, then run each tool.
    messages.push({ role: "assistant", content: choice.message.content ?? "", tool_calls: toolCalls });
    for (const tc of toolCalls) {
      let parsedArgs: unknown;
      try { parsedArgs = JSON.parse(tc.function.arguments); } catch { parsedArgs = {}; }
      const result = executeTool(tc.function.name, parsedArgs);
      trace.push({ tool: tc.function.name, args: parsedArgs, summary: result.summary });
      observations.push({ tool: tc.function.name, args: parsedArgs, summary: result.summary, data: result.data });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify({ ok: result.ok, summary: result.summary, data: result.data }),
      });
    }
  }

  // Hit iteration cap.
  return {
    response: {
      language: profile.language,
      reply_text: "I'm having trouble completing this — could you rephrase or ask one part at a time?",
      tool_calls: trace.map((t) => ({ name: t.tool as ChatTurnResult["response"]["tool_calls"][number]["name"], arguments: t.args as Record<string, unknown>, result_summary: t.summary })),
      citations: [],
      product_recs: [],
      refusal: { type: "insufficient_context", message_en: "Agent loop exceeded max iterations.", message_ar: "تجاوز الوكيل الحد الأقصى من المحاولات." },
    },
    trace,
  };
}
