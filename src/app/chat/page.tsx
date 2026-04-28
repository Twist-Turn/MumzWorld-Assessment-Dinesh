"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { loadProfile } from "@/lib/profile-client";
import { t } from "@/lib/i18n";
import type { ChatResponse, Profile } from "@/lib/types";
import { Bot, ChevronDown, ChevronUp, FileText, Loader2, PackageSearch, Send, ShieldAlert, Sparkles, User, Wrench } from "lucide-react";

type Turn = {
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  trace?: { tool: string; args: unknown; summary: string }[];
};

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
  }, [router]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  if (!profile) return null;
  const lang = profile.language;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userTurn: Turn = { role: "user", content: input };
    const next = [...turns, userTurn];
    setTurns(next);
    setInput("");
    setLoading(true);
    try {
      type HistoryItem = { role: "user" | "assistant"; content: string };
      const history: HistoryItem[] = turns.flatMap<HistoryItem>((tn) => {
        if (tn.role === "user") return [{ role: "user", content: tn.content }];
        if (tn.response) return [{ role: "assistant", content: tn.response.reply_text }];
        return [];
      });
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, history, message: userTurn.content }),
      });
      const data = await r.json();
      if (data.response) {
        setTurns([...next, { role: "assistant", content: data.response.reply_text, response: data.response, trace: data.trace }]);
      } else {
        setTurns([...next, { role: "assistant", content: `Error: ${data.error || "unknown"}` }]);
      }
    } catch (e) {
      setTurns([...next, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const examples = lang === "ar"
    ? ["ماذا أحضّر للأسبوع 32؟", "هل لعبة المسار آمنة لطفلي عمر 12 شهراً؟", "ما الذي يجب وضعه في حقيبة المستشفى؟"]
    : ["What should I prepare at week 32?", "Is the marble run toy safe for my 12-month-old?", "What goes in a hospital bag?"];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="premium-shell rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <Sparkles size={12} />
              {t("Tool-use chat", "محادثة بأدوات", lang)}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{t("Ask the companion", "اسألي الرفيقة", lang)}</h1>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t("Answers stay grounded in milestones, catalog data, and safety checks.", "الإجابات مستندة إلى المراحل والكتالوج وفحوصات السلامة.", lang)}
            </p>
          </div>
          <div className="hidden rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 sm:block">
            {t("Trace visible", "التتبّع ظاهر", lang)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
      <div className="min-h-[460px] space-y-3 rounded-lg border border-zinc-200/80 bg-white/70 p-3 shadow-sm">
        {turns.length === 0 && (
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Wrench size={16} className="text-brand-600" />
                {t("Try an agent task", "جربي مهمة للوكيل", lang)}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {examples.map((q, i) => (
                  <button key={i} onClick={() => setInput(q)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-start text-sm leading-5 text-zinc-700 transition hover:border-brand-200 hover:bg-brand-50">
                    {q}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
        {turns.map((turn, i) => (
          <TurnView key={i} turn={turn} lang={lang} />
        ))}
        {loading ? (
          <div className="flex items-center gap-2 px-2 text-sm text-zinc-500">
            <Loader2 className="animate-spin text-brand-600" size={16} />
            {t("Thinking through tools…", "يحلل عبر الأدوات…", lang)}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-zinc-200/80 bg-zinc-50/95 pb-3 pt-3 backdrop-blur">
        <div className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg shadow-zinc-200/60">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("Ask about pregnancy, baby care, or shopping…", "اسألي عن الحمل أو رعاية الطفل أو التسوق…", lang)}
            className="input-base flex-1 border-0 px-3 py-2.5 shadow-none focus:border-0 focus:shadow-none"
          />
          <Button onClick={send} disabled={loading || !input.trim()} aria-label={t("Send", "إرسال", lang)}><Send size={16} /></Button>
        </div>
      </div>
      </div>
      <aside className="hidden space-y-3 lg:block">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><Wrench size={16} className="text-brand-600" />{t("Available tools", "الأدوات المتاحة", lang)}</div>
          <div className="mt-3 space-y-2">
            {[
              { icon: PackageSearch, label: "search_products" },
              { icon: FileText, label: "lookup_milestone" },
              { icon: ShieldAlert, label: "check_safety" },
              { icon: Sparkles, label: "build_checklist" },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.label} className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-700">
                  <Icon size={14} className="text-brand-600" />
                  {tool.label}
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <div className="font-semibold">{t("Safety behavior", "سلوك السلامة", lang)}</div>
          <div className="mt-1 text-emerald-800">{t("Medical concerns are deferred, unclear inputs ask for context, and citations stay visible.", "المخاوف الطبية تؤجل للطبيب والمدخلات غير الواضحة تطلب سياقاً والمراجع تبقى ظاهرة.", lang)}</div>
        </div>
      </aside>
      </div>
    </div>
  );
}

function TurnView({ turn, lang }: { turn: Turn; lang: "en" | "ar" }) {
  const [traceOpen, setTraceOpen] = useState(false);
  if (turn.role === "user") {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[82%] rounded-lg bg-zinc-950 px-4 py-3 text-sm leading-6 text-white shadow-sm">{turn.content}</div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
          <User size={16} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Bot size={16} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">{turn.content}</div>
          {turn.response?.refusal ? (
            <div className="mt-3">
              <Badge tone={turn.response.refusal.type === "medical" ? "danger" : "warning"}>
                <ShieldAlert size={12} />
                {turn.response.refusal.type}
              </Badge>
            </div>
          ) : null}
        </div>
        {turn.response?.citations && turn.response.citations.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {turn.response.citations.map((c, i) => (
              <Badge key={i} tone="info"><FileText size={11} />{c.kind}:{c.id}</Badge>
            ))}
          </div>
        ) : null}
        {turn.trace && turn.trace.length > 0 ? (
          <details className="text-xs" open={traceOpen} onToggle={(e) => setTraceOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 inline-flex items-center gap-1">
              {traceOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <Wrench size={12} />
              {lang === "ar" ? "تفاصيل الأدوات" : "Agent reasoning"} ({turn.trace.length})
            </summary>
            <div className="mt-2 space-y-1">
              {turn.trace.map((tr, i) => (
                <div key={i} className="rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                  <div className="font-mono text-zinc-700">{tr.tool}({JSON.stringify(tr.args).slice(0, 100)}{JSON.stringify(tr.args).length > 100 ? "..." : ""})</div>
                  <div className="text-zinc-500 mt-0.5">{tr.summary}</div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
