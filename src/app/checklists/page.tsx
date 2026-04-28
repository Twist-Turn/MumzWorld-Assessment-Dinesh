"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { loadProfile } from "@/lib/profile-client";
import { t } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { ArrowRight, Baby, Home, ListChecks, Luggage, Sparkles } from "lucide-react";

const STAGES = [
  { id: "hospital_bag",            en: "Hospital bag",           ar: "حقيبة المستشفى",        when_en: "Week 32+",         when_ar: "من الأسبوع 32", icon: Luggage, tone: "text-brand-600 bg-brand-50 border-brand-100" },
  { id: "nursery_setup",           en: "Nursery setup",          ar: "تجهيز غرفة المولود",    when_en: "Week 28+",         when_ar: "من الأسبوع 28", icon: Home, tone: "text-teal-700 bg-teal-50 border-teal-100" },
  { id: "first_month_essentials",  en: "First month essentials", ar: "أساسيات الشهر الأول",   when_en: "Newborn",          when_ar: "حديث الولادة", icon: Baby, tone: "text-sky-700 bg-sky-50 border-sky-100" },
  { id: "baby_proofing",           en: "Baby-proofing",          ar: "تأمين المنزل",          when_en: "Month 6+",         when_ar: "من الشهر 6", icon: ListChecks, tone: "text-amber-700 bg-amber-50 border-amber-100" },
];

export default function ChecklistHubPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
  }, [router]);
  if (!profile) return null;
  const lang = profile.language;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-lg border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-200/50">
        <Badge tone="brand"><Sparkles size={12} />{t("Stage planning", "تخطيط المرحلة", lang)}</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{t("AI-generated checklists", "قوائم مولدة بالذكاء الاصطناعي", lang)}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">{t("Each item is generated for your stage, grounded in the knowledge base, and paired with products when useful.", "كل عنصر مولد لمرحلتك ومستند إلى قاعدة المعرفة ومربوط بالمنتجات عند الحاجة.", lang)}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STAGES.map((s) => (
          <Link key={s.id} href={`/checklists/${s.id}`} className="group rounded-lg border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={`grid h-10 w-10 place-items-center rounded-lg border ${s.tone}`}>
                  <s.icon size={18} />
                </div>
                <div className="mt-4 text-base font-semibold text-zinc-950">{lang === "ar" ? s.ar : s.en}</div>
                <div className="mt-1 text-sm text-zinc-500">{t("Generated with why-now rationales", "تتضمن سبب أهمية كل عنصر الآن", lang)}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <Badge tone="brand">{lang === "ar" ? s.when_ar : s.when_en}</Badge>
                <ArrowRight className="text-zinc-300 transition group-hover:text-brand-600 rtl:rotate-180" size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
