import {
  BriefResponse, ChatResponse, ShoppingListResponse, SafetyCheckResponse, ChecklistResponse,
  type Profile, type Refusal,
} from "../types";
import { MODELS, getOpenAI } from "../openai";
import { loadPrompt } from "./prompts";
import { generateValidated } from "./validator";
import { retrieve } from "./retriever";
import { classify } from "./classifier";
import { runChatTurn } from "./agent_loop";

function buildLabel(profile: Profile): { en: string; ar: string } {
  if (profile.stage === "pregnancy" && profile.pregnancy_week !== null) {
    return { en: `Week ${profile.pregnancy_week}`, ar: `الأسبوع ${profile.pregnancy_week}` };
  }
  if (profile.stage === "baby" && profile.child_age_months !== null) {
    return { en: `Month ${profile.child_age_months}`, ar: `الشهر ${profile.child_age_months}` };
  }
  return { en: "Your stage", ar: "مرحلتك" };
}

function refusalForMedical(language: Profile["language"]): Refusal {
  return {
    type: "medical",
    message_en: "This sounds like something a doctor should answer. Please call your pediatrician/OB or your local emergency number if it's urgent. I can't safely advise on specific symptoms or doses.",
    message_ar: "يبدو أن هذا سؤال طبي يجب أن يجيب عنه طبيبك. يُرجى الاتصال بطبيب الأطفال أو طبيب التوليد، أو رقم الطوارئ المحلي إذا كانت الحالة عاجلة. لا يمكنني تقديم نصيحة طبية بشأن أعراض أو جرعات محددة.",
  };
}

function refusalForOOS(language: Profile["language"]): Refusal {
  return {
    type: "out_of_scope",
    message_en: "I only help with pregnancy, baby and toddler care, and shopping for those things. Is there something parenting-related I can help with?",
    message_ar: "أساعدكِ فقط في الحمل ورعاية الأطفال الرضع والصغار والتسوق لتلك الأمور. هل هناك ما يخص رعاية الطفل أستطيع مساعدتكِ فيه؟",
  };
}

// -----------------------------------------------------------------------------

export async function runBrief(profile: Profile): Promise<BriefResponse> {
  const ageMonths = profile.stage === "baby" ? profile.child_age_months : (profile.pregnancy_week !== null ? -((40 - profile.pregnancy_week) / 4.345) : null);
  const stageQuery = profile.stage === "pregnancy"
    ? `pregnancy week ${profile.pregnancy_week} milestones, what to prepare, products`
    : `baby month ${profile.child_age_months} milestones, sleep feeding development, products`;

  const { kb, products } = await retrieve(stageQuery, profile, { topKKB: 4, topKProducts: 8 });
  const labels = buildLabel(profile);

  if (kb.length === 0 && products.length === 0) {
    return {
      language: profile.language,
      week_or_month_label_en: labels.en,
      week_or_month_label_ar: labels.ar,
      milestone_en: "",
      milestone_ar: "",
      product_recs: [],
      citations: [],
      refusal: { type: "insufficient_context", message_en: "We don't have enough curated content for this stage yet.", message_ar: "ليس لدينا محتوى كافٍ لهذه المرحلة حالياً." },
    };
  }

  const userMessage = JSON.stringify({
    profile,
    label_en: labels.en, label_ar: labels.ar,
    kb_candidates: kb.map((k) => ({ id: k.entry.id, title: k.entry.title_en, milestone: k.entry.milestone_en, focus_areas: k.entry.focus_areas })),
    product_candidates: products.map((p) => ({
      id: p.product.id, name: p.product.name_en, description: p.product.description_en,
      category: p.product.category, age_range_min_months: p.product.age_range_min_months,
      age_range_max_months: p.product.age_range_max_months, price_aed: p.product.price_aed,
      safety_notes: p.product.safety_notes,
    })),
  }, null, 2);

  const result = await generateValidated({
    schema: BriefResponse,
    systemPrompt: loadPrompt("brief_generator"),
    userMessage,
  });

  if (!result.ok) {
    return {
      language: profile.language,
      week_or_month_label_en: labels.en,
      week_or_month_label_ar: labels.ar,
      milestone_en: "",
      milestone_ar: "",
      product_recs: [],
      citations: [],
      refusal: { type: "insufficient_context", message_en: `Schema validation failed: ${result.error}`, message_ar: "تعذّر التحقق من المخطط." },
    };
  }
  return result.value;
}

// -----------------------------------------------------------------------------

export async function runChat(args: {
  profile: Profile;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<{ response: ChatResponse; trace: { tool: string; args: unknown; summary: string }[] }> {
  // Pre-route via classifier — short-circuit medical and OOS for safety.
  const cls = await classify(args.message);
  if (cls.category === "medical") {
    return {
      response: {
        language: args.profile.language,
        reply_text: args.profile.language === "ar" ? refusalForMedical(args.profile.language).message_ar : refusalForMedical(args.profile.language).message_en,
        tool_calls: [],
        citations: [],
        product_recs: [],
        refusal: refusalForMedical(args.profile.language),
      },
      trace: [{ tool: "<classifier>", args: { category: "medical" }, summary: cls.reason_en }],
    };
  }
  if (cls.category === "out_of_scope") {
    return {
      response: {
        language: args.profile.language,
        reply_text: args.profile.language === "ar" ? refusalForOOS(args.profile.language).message_ar : refusalForOOS(args.profile.language).message_en,
        tool_calls: [],
        citations: [],
        product_recs: [],
        refusal: refusalForOOS(args.profile.language),
      },
      trace: [{ tool: "<classifier>", args: { category: "out_of_scope" }, summary: cls.reason_en }],
    };
  }
  return runChatTurn(args);
}

// -----------------------------------------------------------------------------

export async function runVoice(args: { profile: Profile; audioBuffer: Buffer; filename: string }): Promise<ShoppingListResponse> {
  const client = getOpenAI();

  // 1. Whisper transcription
  const file = new File([new Uint8Array(args.audioBuffer)], args.filename, { type: "audio/webm" });
  const transcription = await client.audio.transcriptions.create({
    model: MODELS.WHISPER,
    file,
    response_format: "json",
  });
  const transcript = transcription.text.trim();

  if (!transcript) {
    return {
      language: args.profile.language,
      transcript: "",
      items: [],
      refusal: { type: "unclear_input", message_en: "I couldn't make out any speech in that recording.", message_ar: "لم أتمكن من تمييز أي كلام في التسجيل." },
    };
  }

  // 2. Detect intent — short-circuit OOS via classifier
  const cls = await classify(transcript);
  if (cls.category === "out_of_scope") {
    return {
      language: cls.language_detected,
      transcript,
      items: [],
      refusal: refusalForOOS(args.profile.language),
    };
  }

  // 3. Retrieve product candidates by transcript content
  const { products } = await retrieve(transcript, args.profile, { topKProducts: 12 });

  // 4. Structured extraction
  const userMessage = JSON.stringify({
    transcript,
    language: cls.language_detected,
    today_iso: new Date().toISOString().slice(0, 10),
    product_candidates: products.map((p) => ({
      id: p.product.id, name: p.product.name_en, description: p.product.description_en, category: p.product.category,
    })),
  }, null, 2);

  const result = await generateValidated({
    schema: ShoppingListResponse,
    systemPrompt: loadPrompt("voice_extractor"),
    userMessage,
  });

  if (!result.ok) {
    return {
      language: cls.language_detected,
      transcript,
      items: [],
      refusal: { type: "insufficient_context", message_en: `Extraction validation failed: ${result.error}`, message_ar: "تعذّر استخراج العناصر." },
    };
  }
  return result.value;
}

// -----------------------------------------------------------------------------

export async function runVision(args: { profile: Profile; imageBase64: string; mimeType: string }): Promise<SafetyCheckResponse> {
  const client = getOpenAI();
  const dataUrl = `data:${args.mimeType};base64,${args.imageBase64}`;

  // Build a vision message. We use the standard chat completion with an image_url block.
  const ageMonths = args.profile.stage === "baby" ? args.profile.child_age_months : null;
  const userPayload = `Profile: ${JSON.stringify({ stage: args.profile.stage, child_age_months: ageMonths, pregnancy_week: args.profile.pregnancy_week, language: args.profile.language })}\nLanguage to reply in: ${args.profile.language}\n\nReturn the JSON object exactly as specified.`;

  const resp = await client.chat.completions.create({
    model: MODELS.VISION,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: loadPrompt("vision_safety") },
      { role: "user", content: [
        { type: "text", text: userPayload },
        { type: "image_url", image_url: { url: dataUrl } },
      ] },
    ],
  });
  const raw = resp.choices[0].message.content ?? "";
  const parsed = SafetyCheckResponse.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return {
      language: args.profile.language,
      recognized_item_en: null, recognized_item_ar: null, category: null, age_appropriate: null,
      verdict_en: "I couldn't analyze this photo reliably. Please try a clearer image of the product.",
      verdict_ar: "لم أتمكن من تحليل هذه الصورة بشكل موثوق. يرجى تجربة صورة أوضح للمنتج.",
      concerns: [], confidence: "low",
      refusal: { type: "unclear_input", message_en: "Vision response failed schema validation.", message_ar: "تعذّر التحقق من مخطط استجابة الرؤية." },
    };
  }
  return parsed.data;
}

// -----------------------------------------------------------------------------

export async function runChecklist(args: { profile: Profile; stage_id: string }): Promise<ChecklistResponse> {
  const stageQuery = `${args.stage_id.replace(/_/g, " ")} essentials parenting`;
  const { kb, products } = await retrieve(stageQuery, args.profile, { topKKB: 6, topKProducts: 12 });

  const userMessage = JSON.stringify({
    profile: args.profile,
    stage_id: args.stage_id,
    kb_candidates: kb.map((k) => ({ id: k.entry.id, title: k.entry.title_en, milestone: k.entry.milestone_en, focus_areas: k.entry.focus_areas })),
    product_candidates: products.map((p) => ({
      id: p.product.id, name: p.product.name_en, description: p.product.description_en,
      category: p.product.category, age_range_min_months: p.product.age_range_min_months, age_range_max_months: p.product.age_range_max_months,
    })),
  }, null, 2);

  const result = await generateValidated({
    schema: ChecklistResponse,
    systemPrompt: loadPrompt("checklist_generator"),
    userMessage,
  });

  if (!result.ok) {
    return {
      stage_id: args.stage_id,
      language: args.profile.language,
      title_en: "Checklist",
      title_ar: "قائمة التحضير",
      items: [],
      refusal: { type: "insufficient_context", message_en: `Schema validation failed: ${result.error}`, message_ar: "تعذّر التحقق من المخطط." },
    };
  }
  return result.value;
}
