"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadProfile } from "@/lib/profile-client";
import { t } from "@/lib/i18n";
import type { Profile, SafetyCheckResponse } from "@/lib/types";
import { AlertCircle, AlertTriangle, Camera, CheckCircle2, ImagePlus, Loader2, ScanSearch, ShieldCheck, XCircle } from "lucide-react";

export default function PhotoPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SafetyCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
  }, [router]);

  if (!profile) return null;
  const lang = profile.language;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!imageFile) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("profile", JSON.stringify(profile));
      fd.append("image", imageFile, imageFile.name);
      const r = await fetch("/api/vision", { method: "POST", body: fd });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const data = await r.json() as SafetyCheckResponse;
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <Badge tone="brand"><Camera size={12} />{t("Vision safety", "سلامة بالرؤية", lang)}</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{t("Photo safety check", "فحص السلامة بالصورة", lang)}</h1>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {t("Upload a product photo. The companion identifies the item, checks age fit, and says when the image is unclear.", "ارفعي صورة منتج. الرفيقة تحدد العنصر وتفحص ملاءمة العمر وتوضح إذا كانت الصورة غير واضحة.", lang)}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <label className="block">
            <div className="cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center transition hover:border-brand-300 hover:bg-brand-50/60">
              <ImagePlus size={32} className="mx-auto mb-3 text-brand-600" />
              <div className="text-sm font-medium text-zinc-800">{t("Choose a product photo", "اختاري صورة منتج", lang)}</div>
              <div className="mt-1 text-xs text-zinc-500">JPEG, PNG, HEIC</div>
            </div>
            <input type="file" accept="image/*" onChange={onPick} className="hidden" />
          </label>
          {imageUrl ? (
            <>
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <img src={imageUrl} alt="" className="max-h-72 w-full object-contain" />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <ScanSearch size={16} />}
                {submitting ? t("Analyzing…", "جاري التحليل…", lang) : t("Check safety", "افحصي السلامة", lang)}
              </Button>
            </>
          ) : null}
          {error ? <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={16} />{error}</div> : null}
        </CardBody>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("Analysis result", "نتيجة التحليل", lang)}</div>
                <h2 className="mt-1 text-lg font-semibold">{t("Safety verdict", "حكم السلامة", lang)}</h2>
              </div>
              <Badge tone={result.confidence === "high" ? "success" : result.confidence === "medium" ? "info" : "warning"}>
                {t("confidence:", "ثقة:", lang)} {result.confidence}
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {result.refusal ? (
              <div className="text-amber-700 text-sm">{lang === "ar" ? result.refusal.message_ar : result.refusal.message_en}</div>
            ) : (
              <>
                {result.recognized_item_en || result.recognized_item_ar ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("Recognized as", "تم التعرف عليه على أنه", lang)}</div>
                    <div className="mt-1 font-semibold text-zinc-950">{lang === "ar" ? result.recognized_item_ar : result.recognized_item_en}</div>
                  </div>
                ) : null}
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500"><ShieldCheck size={12} />{t("Verdict", "الحكم", lang)}</div>
                  <p className="text-sm leading-6 text-zinc-700">{lang === "ar" ? result.verdict_ar : result.verdict_en}</p>
                </div>
                {result.age_appropriate !== null ? (
                  <Badge tone={result.age_appropriate ? "success" : "danger"}>
                    {result.age_appropriate ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {result.age_appropriate ? t("Age-appropriate", "مناسب للعمر", lang) : t("NOT age-appropriate", "غير مناسب للعمر", lang)}
                  </Badge>
                ) : (
                  <Badge tone="warning">{t("Could not determine age fit", "تعذّر تحديد ملاءمة العمر", lang)}</Badge>
                )}
                {result.concerns.length > 0 ? (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500"><AlertTriangle size={12} />{t("Concerns", "ملاحظات", lang)}</div>
                    <div className="space-y-1.5">
                      {result.concerns.map((c, i) => (
                        <div key={i} className={`rounded-lg border p-3 text-sm ${c.severity === "high" ? "border-red-200 bg-red-50 text-red-800" : c.severity === "medium" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
                          <span className="font-medium uppercase text-xs">{c.severity}</span> · {lang === "ar" ? c.issue_ar : c.issue_en}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
          <ShieldCheck className="mx-auto text-zinc-300" size={36} />
          <div className="mt-3 text-sm font-medium text-zinc-700">{t("Safety analysis will appear here", "سيظهر تحليل السلامة هنا", lang)}</div>
          <div className="mt-1 text-xs text-zinc-500">{t("Use a clear photo of one product for the best result.", "استخدمي صورة واضحة لمنتج واحد للحصول على أفضل نتيجة.", lang)}</div>
        </div>
      )}
      </div>
    </div>
  );
}
