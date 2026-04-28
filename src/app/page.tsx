"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { loadProfile } from "@/lib/profile-client";
import { t, toArabicNumerals } from "@/lib/i18n";
import type { BriefResponse, Profile, Product } from "@/lib/types";
import { Activity, AlertCircle, ArrowRight, Bot, Camera, CheckCircle2, FileText, HeartPulse, ListChecks, Loader2, MessageSquare, Mic, PackageSearch, ShieldCheck, ShoppingBag, Sparkles, WandSparkles } from "lucide-react";

type Catalog = Record<string, Product>;

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";

    (async () => {
      try {
        const [briefRes, catRes] = await Promise.all([
          fetch("/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: p }) }),
          fetch("/api/catalog").catch(() => null),
        ]);
        if (!briefRes.ok) throw new Error(`brief ${briefRes.status}`);
        const data = (await briefRes.json()) as BriefResponse;
        setBrief(data);

        const list = catRes && catRes.ok ? (await catRes.json()) as Product[] : [];
        const cat: Catalog = {};
        for (const item of list) cat[item.id] = item;
        setCatalog(cat);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (!profile) return null;
  const lang = profile.language;
  const stageLabel = lang === "ar"
    ? (profile.stage === "pregnancy" ? "الحمل" : "الطفل")
    : (profile.stage === "pregnancy" ? "Pregnancy" : "Baby");
  const weekLabel = lang === "ar"
    ? (brief?.week_or_month_label_ar || (profile.stage === "pregnancy" ? `الأسبوع ${toArabicNumerals(profile.pregnancy_week ?? "")}` : `الشهر ${toArabicNumerals(profile.child_age_months ?? "")}`))
    : (brief?.week_or_month_label_en || (profile.stage === "pregnancy" ? `Week ${profile.pregnancy_week}` : `Month ${profile.child_age_months}`));
  const actionCards = [
    {
      href: "/chat",
      title: t("Ask Companion", "اسألي الرفيقة", lang),
      body: t("Tool-using answers with citations", "إجابات بأدوات ومراجع", lang),
      icon: MessageSquare,
      accent: "text-brand-700 bg-brand-50 border-brand-100",
      metric: t("Agent loop", "حلقة وكيل", lang),
    },
    {
      href: "/voice",
      title: t("Voice memo", "تسجيل صوتي", lang),
      body: t("Turn speech into a shopping list", "حوّلي الكلام إلى قائمة تسوق", lang),
      icon: Mic,
      accent: "text-teal-700 bg-teal-50 border-teal-100",
      metric: t("Whisper", "ويسبر", lang),
    },
    {
      href: "/photo",
      title: t("Photo safety", "سلامة بالصورة", lang),
      body: t("Check age fit from a product photo", "افحصي ملاءمة العمر من صورة", lang),
      icon: Camera,
      accent: "text-amber-700 bg-amber-50 border-amber-100",
      metric: t("Vision", "رؤية", lang),
    },
    {
      href: "/checklists",
      title: t("Checklists", "القوائم", lang),
      body: t("Stage-aware prep lists", "قوائم تجهيز حسب المرحلة", lang),
      icon: ListChecks,
      accent: "text-sky-700 bg-sky-50 border-sky-100",
      metric: t("Grounded", "موثقة", lang),
    },
  ];
  const cityLabel = profile.city.replace("_", " ");
  const productCount = brief?.product_recs.length ?? 0;
  const citationCount = brief?.citations.length ?? 0;

  return (
    <div className="space-y-8">
      <section className="premium-shell overflow-hidden rounded-lg">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_420px]">
          <div className="surface-grid p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand"><Sparkles size={12} />{t("Live stage brief", "ملخص مرحلي مباشر", lang)}</Badge>
              <Badge tone="neutral">{stageLabel}</Badge>
              <Badge tone="neutral">{cityLabel} · {profile.currency}</Badge>
            </div>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {t("Your companion for", "رفيقتك في", lang)} <span className="text-brand-600">{weekLabel}</span>
            </h1>
            <div className="mt-5 max-w-3xl">
              {loading ? (
                <div className="space-y-3" aria-live="polite">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600"><Loader2 className="animate-spin text-brand-600" size={16} />{t("Generating your stage brief...", "جاري إعداد ملخص مرحلتكِ...", lang)}</div>
                  <div className="h-3 w-full max-w-xl animate-pulse rounded-full bg-zinc-200" />
                  <div className="h-3 w-4/5 max-w-lg animate-pulse rounded-full bg-zinc-200" />
                </div>
              ) : error ? (
                <div role="alert" className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={16} />{error}</div>
              ) : brief?.refusal ? (
                <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{lang === "ar" ? brief.refusal.message_ar : brief.refusal.message_en}</div>
              ) : (
                <p className="text-base leading-8 text-zinc-700 sm:text-lg">{lang === "ar" ? brief?.milestone_ar : brief?.milestone_en}</p>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/chat" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/15 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                <MessageSquare size={17} />
                {t("Ask a follow-up", "اسألي متابعة", lang)}
              </Link>
              <Link href="/evals" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                <Activity size={17} />
                {t("View evals", "عرض التقييمات", lang)}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500"><PackageSearch size={15} />{t("Catalog picks", "اختيارات الكتالوج", lang)}</div>
                <div className="mt-2 text-3xl font-semibold text-zinc-950">{loading ? "-" : productCount}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500"><FileText size={15} />{t("Citations", "المراجع", lang)}</div>
                <div className="mt-2 text-3xl font-semibold text-zinc-950">{loading ? "-" : citationCount}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500"><ShieldCheck size={15} />{t("Guardrails", "الحماية", lang)}</div>
                <div className="mt-2 text-sm font-semibold text-emerald-700">{t("Medical deferral ready", "إحالة طبية جاهزة", lang)}</div>
              </div>
            </div>

            {brief?.citations && brief.citations.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {brief.citations.map((c, i) => (
                  <Badge key={i} tone="info"><FileText size={11} />{c.kind}:{c.id}</Badge>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="bg-zinc-950 p-5 text-white sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-cyan-200">{t("Companion console", "لوحة الرفيقة", lang)}</div>
                <div className="mt-1 text-lg font-semibold">{t("Multimodal AI flow", "تدفق ذكاء متعدد الوسائط", lang)}</div>
              </div>
              <Bot className="text-cyan-200" size={24} />
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ms-auto text-xs text-zinc-300">gpt-4o</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: WandSparkles, label: t("Classify request", "تصنيف الطلب", lang), value: t("ok", "مناسب", lang), color: "text-cyan-200" },
                  { icon: FileText, label: t("Retrieve KB", "استرجاع المعرفة", lang), value: loading ? "..." : `${citationCount}`, color: "text-sky-200" },
                  { icon: ShoppingBag, label: t("Rank products", "ترتيب المنتجات", lang), value: loading ? "..." : `${productCount}`, color: "text-pink-200" },
                  { icon: CheckCircle2, label: t("Validate schema", "تحقق من البنية", lang), value: "Zod", color: "text-emerald-200" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-3">
                      <Icon size={16} className={row.color} />
                      <div className="min-w-0 flex-1 text-sm text-zinc-200">{row.label}</div>
                      <div className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">{row.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4">
              <div className="flex items-center gap-2 text-emerald-200"><HeartPulse size={18} /><span className="text-sm font-semibold">{t("Uncertainty handling", "التعامل مع عدم اليقين", lang)}</span></div>
              <div className="mt-2 text-sm leading-6 text-zinc-300">{t("Medical, unclear, and out-of-scope cases are surfaced as explicit safe responses.", "الحالات الطبية أو غير الواضحة أو خارج النطاق تظهر كردود آمنة وصريحة.", lang)}</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actionCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group lifted-surface rounded-lg p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/50">
              <div className="flex items-start justify-between gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-lg border ${item.accent}`}>
                <Icon size={18} />
              </div>
                <Badge tone="neutral">{item.metric}</Badge>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-zinc-950">{item.title}</div>
                  <div className="mt-1 text-sm leading-5 text-zinc-500">{item.body}</div>
                </div>
                <ArrowRight className="shrink-0 text-zinc-300 transition group-hover:text-brand-600 rtl:rotate-180" size={16} />
              </div>
            </Link>
          );
        })}
      </section>

      {!loading && brief && brief.product_recs.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("Personalized commerce", "تجارة مخصصة", lang)}</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{t("Picked for you this week", "اختياراتنا لكِ هذا الأسبوع", lang)}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">{t("Recommendations show reasoning, confidence, age fit, and safety notes instead of generic product tiles.", "التوصيات تعرض السبب والثقة وملاءمة العمر وملاحظات السلامة بدلاً من بطاقات منتجات عامة.", lang)}</p>
            </div>
            <Badge tone="brand"><PackageSearch size={12} />{productCount} {t("matched", "مطابقة", lang)}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {brief.product_recs.map((rec, i) => {
              const product = catalog[rec.product_id];
              if (!product) return <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertCircle className="me-1 inline" size={13} />{t("Recommendation referenced unknown product:", "توصية تشير إلى منتج غير معروف:", lang)} {rec.product_id}</div>;
              return <ProductCard key={i} product={product} rec={rec} language={lang} currency={profile.currency} />;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
