"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadProfile } from "@/lib/profile-client";
import { t } from "@/lib/i18n";
import type { ChecklistResponse, Profile } from "@/lib/types";
import { AlertCircle, ArrowLeft, Check, FileText, Loader2, Package, Sparkles } from "lucide-react";

const STORAGE_PREFIX = "mumz_checklist_state_v1__";

export default function ChecklistPage() {
  const router = useRouter();
  const { stage } = useParams<{ stage: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
    // Load checked state
    const raw = localStorage.getItem(STORAGE_PREFIX + stage);
    if (raw) try { setChecked(JSON.parse(raw)); } catch {}
    // Fetch checklist
    (async () => {
      try {
        const r = await fetch("/api/checklist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: p, stage_id: stage }) });
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        const json = await r.json() as ChecklistResponse;
        setData(json);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, stage]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(STORAGE_PREFIX + stage, JSON.stringify(next));
  };

  if (!profile) return null;
  const lang = profile.language;
  const total = data?.items.length ?? 0;
  const done = data ? data.items.filter((i) => checked[i.id]).length : 0;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge tone="brand"><Sparkles size={12} />{t("AI checklist", "قائمة ذكية", lang)}</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{loading ? t("Generating checklist", "جاري إنشاء القائمة", lang) : (lang === "ar" ? data?.title_ar : data?.title_en)}</h1>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{t("Check off progress locally. Each item includes a why-now rationale and source/product references when available.", "حددي التقدم محلياً. كل عنصر يتضمن سبب أهميته الآن ومراجع أو منتجات عند توفرها.", lang)}</p>
            </div>
            {total > 0 ? <Badge tone="brand">{done}/{total}</Badge> : null}
          </div>
          {total > 0 ? (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>{t("Progress", "التقدم", lang)}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardBody>
          {loading ? <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="animate-spin text-brand-600" size={16} />{t("Generating your checklist…", "جاري إنشاء قائمتك…", lang)}</div>
            : error ? <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={16} />{error}</div>
            : data?.refusal ? <div className="text-amber-700 text-sm">{lang === "ar" ? data.refusal.message_ar : data.refusal.message_en}</div>
            : (
              <ul className="space-y-2">
                {data?.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <li key={item.id} className={`flex items-start gap-3 rounded-lg border p-3 transition ${isChecked ? "border-zinc-200 bg-zinc-50" : "border-zinc-200 bg-white hover:border-brand-200"}`}>
                      <button onClick={() => toggle(item.id)} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition ${isChecked ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-300 bg-white hover:border-brand-400"}`}>
                        {isChecked ? <Check size={14} /> : null}
                      </button>
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? "text-zinc-400 line-through" : "text-zinc-950"}`}>
                          {lang === "ar" ? item.title_ar : item.title_en}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-zinc-600">{lang === "ar" ? item.why_now_ar : item.why_now_en}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.linked_product_id ? <Badge tone="brand"><Package size={11} />{item.linked_product_id}</Badge> : null}
                          {item.citation_kb_id ? <Badge tone="info"><FileText size={11} />{item.citation_kb_id}</Badge> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </CardBody>
      </Card>
      <div className="text-center"><Button variant="ghost" onClick={() => router.push("/checklists")}><ArrowLeft size={16} className="rtl:rotate-180" />{t("All checklists", "كل القوائم", lang)}</Button></div>
    </div>
  );
}
