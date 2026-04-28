import { getOpenAI, MODELS } from "../openai";
import { ChatResponse, type Profile } from "../types";
import { loadPrompt } from "./prompts";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import { parseStrict } from "./validator";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_ITER = 5;

export type ChatTurnResult = {
  response: typeof ChatResponse._type;
  trace: { tool: string; args: unknown; summary: string }[];
};

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
        return { response: { ...parsed.value, tool_calls: trace.map((t) => ({ name: t.tool as ChatTurnResult["response"]["tool_calls"][number]["name"], arguments: t.args as Record<string, unknown>, result_summary: t.summary })) }, trace };
      }
      // Fall back: return a minimal valid response with the prose reply.
      return {
        response: {
          language: profile.language,
          reply_text: choice.message.content ?? "I had trouble formatting my response. Please try again.",
          tool_calls: trace.map((t) => ({ name: t.tool as ChatTurnResult["response"]["tool_calls"][number]["name"], arguments: t.args as Record<string, unknown>, result_summary: t.summary })),
          citations: [],
          product_recs: [],
          refusal: { type: "insufficient_context", message_en: "Response failed schema validation; raw text returned.", message_ar: "تعذّر التحقق من تنسيق الاستجابة؛ تم إرجاع النص الخام." },
        },
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
