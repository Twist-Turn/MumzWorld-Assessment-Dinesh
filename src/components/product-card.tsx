"use client";
import { Badge } from "@/components/ui/badge";
import type { Product, ProductRec, Confidence } from "@/lib/types";
import { formatPrice, t } from "@/lib/i18n";
import { AlertTriangle, Baby, Heart, Package, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";

const tone: Record<Confidence, "success" | "info" | "warning"> = { high: "success", medium: "info", low: "warning" };
const categoryAccent: Record<Product["category"], string> = {
  feeding: "from-teal-50 to-cyan-50 text-teal-700 border-teal-100",
  sleep: "from-sky-50 to-indigo-50 text-sky-700 border-sky-100",
  gear: "from-zinc-50 to-slate-100 text-slate-700 border-slate-200",
  health: "from-emerald-50 to-teal-50 text-emerald-700 border-emerald-100",
  clothing: "from-pink-50 to-rose-50 text-brand-700 border-brand-100",
  toys: "from-amber-50 to-yellow-50 text-amber-700 border-amber-100",
  maternity: "from-brand-50 to-pink-50 text-brand-700 border-brand-100",
  other: "from-zinc-50 to-zinc-100 text-zinc-700 border-zinc-200",
};

export function ProductCard({ product, rec, language, currency }: { product: Product; rec?: typeof ProductRec._type; language: "en" | "ar"; currency: string }) {
  const categoryLabel = t(product.category, product.category, language);
  const fitPercent = Math.max(12, Math.min(100, ((product.age_range_max_months - product.age_range_min_months) / 60) * 100));
  const accent = categoryAccent[product.category];

  return (
    <article className="group overflow-hidden rounded-lg border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/50 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/40">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-cyan-500 to-emerald-500" />
      <div className="p-4">
      <div className="flex gap-4">
        <div className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border bg-gradient-to-br ${accent}`}>
          {product.image_url ? (
            <img src={product.image_url} alt={language === "ar" ? product.name_ar : product.name_en} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <ShoppingBag size={28} />
          )}
          <div className="absolute bottom-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-brand-600 shadow-sm">
            <Heart size={11} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-2 text-base font-semibold leading-snug text-zinc-950">{language === "ar" ? product.name_ar : product.name_en}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="neutral"><Package size={11} />{categoryLabel}</Badge>
                <Badge tone="info"><Baby size={11} />{product.age_range_min_months}–{product.age_range_max_months} {language === "ar" ? "شهر" : "mo"}</Badge>
              </div>
            </div>
            <div className="shrink-0 rounded-md bg-zinc-950 px-3 py-2 text-xs font-semibold text-white shadow-sm">
              {formatPrice(product.price_aed, currency, language)}
            </div>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600">
            {rec ? (language === "ar" ? rec.reason_ar : rec.reason_en) : (language === "ar" ? product.description_ar : product.description_en)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        {rec ? <Badge tone={tone[rec.confidence]}><Sparkles size={11} />{language === "ar" ? "مطابقة" : "match"}: {rec.confidence}</Badge> : null}
        <Badge tone="success"><ShieldCheck size={11} />{language === "ar" ? "مدى العمر" : "age range"}</Badge>
        {product.safety_notes ? <Badge tone="warning"><AlertTriangle size={11} />{language === "ar" ? "ملاحظة سلامة" : "Safety note"}</Badge> : null}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500" style={{ width: `${fitPercent}%` }} />
      </div>
      {product.safety_notes ? <div className="mt-2 text-xs leading-relaxed text-amber-800">{product.safety_notes}</div> : null}
      </div>
    </article>
  );
}
