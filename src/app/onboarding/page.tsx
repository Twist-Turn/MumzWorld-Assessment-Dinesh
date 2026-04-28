"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveProfile } from "@/lib/profile-client";
import { City, Language, Profile, Stage, cityToCurrency } from "@/lib/types";
import { Baby, CalendarHeart, Check, ChevronLeft, ChevronRight, HeartPulse, Languages, MapPin, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState<typeof Stage._type>("pregnancy");
  const [pregnancyWeek, setPregnancyWeek] = useState(28);
  const [childAgeMonths, setChildAgeMonths] = useState(6);
  const [language, setLanguage] = useState<typeof Language._type>("en");
  const [city, setCity] = useState<typeof City._type>("dubai");

  const finish = () => {
    const profile: Profile = {
      language, city, currency: cityToCurrency(city),
      stage,
      pregnancy_week: stage === "pregnancy" ? pregnancyWeek : null,
      child_age_months: stage === "baby" ? childAgeMonths : null,
      due_date_iso: null, child_dob_iso: null,
    };
    saveProfile(profile);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    router.push("/");
    router.refresh();
  };
  const stepLabels = language === "ar" ? ["المرحلة", "اللغة", "المدينة"] : ["Stage", "Language", "City"];
  const nextIcon = language === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
  const backIcon = language === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
      <div className="text-center">
        <Badge tone="brand"><Sparkles size={12} />{language === "ar" ? "إعداد شخصي" : "Personal setup"}</Badge>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-zinc-950">
          {language === "ar" ? "أهلاً بكِ في رفيقة ممزورلد" : "Welcome to Mumzworld Companion"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
          {language === "ar"
            ? "ثلاث خطوات قصيرة حتى تكون الإرشادات والمنتجات مناسبة لمرحلتك ومدينتك."
            : "Three quick steps so guidance and product picks match your stage, language, and city."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className={`rounded-lg border px-3 py-2 text-center text-xs font-medium ${i <= step ? "border-brand-200 bg-brand-50 text-brand-700" : "border-zinc-200 bg-white text-zinc-500"}`}>
            <span className="me-1 inline-grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] shadow-sm">{i < step ? <Check size={12} /> : i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{language === "ar" ? "الخطوة 1 من 3" : "Step 1 of 3"}</div>
            <h2 className="mt-1 text-lg font-semibold">{language === "ar" ? "ما هي مرحلتك؟" : "What stage are you in?"}</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStage("pregnancy")} className={`rounded-lg border p-4 text-start transition ${stage === "pregnancy" ? "border-brand-400 bg-brand-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                <CalendarHeart className="text-brand-600" size={24} />
                <div className="mt-3 font-medium">{language === "ar" ? "حامل" : "Pregnant"}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">{language === "ar" ? "إرشاد أسبوعي وتجهيزات قبل الولادة" : "Weekly guidance and birth prep"}</div>
              </button>
              <button onClick={() => setStage("baby")} className={`rounded-lg border p-4 text-start transition ${stage === "baby" ? "border-brand-400 bg-brand-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                <Baby className="text-teal-700" size={24} />
                <div className="mt-3 font-medium">{language === "ar" ? "لديّ طفل" : "Have a baby"}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">{language === "ar" ? "مراحل النمو والسلامة حسب العمر" : "Milestones and safety by age"}</div>
              </button>
            </div>

            {stage === "pregnancy" ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">{language === "ar" ? "أي أسبوع؟" : "Which week?"}</label>
                  <Badge tone="brand">{language === "ar" ? `الأسبوع ${pregnancyWeek}` : `Week ${pregnancyWeek}`}</Badge>
                </div>
                <input type="range" min={1} max={40} value={pregnancyWeek} onChange={(e) => setPregnancyWeek(Number(e.target.value))} className="w-full" />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">{language === "ar" ? "كم عمر طفلك؟" : "How old is your child?"}</label>
                  <Badge tone="brand">{language === "ar" ? `الشهر ${childAgeMonths}` : `Month ${childAgeMonths}`}</Badge>
                </div>
                <input type="range" min={0} max={36} value={childAgeMonths} onChange={(e) => setChildAgeMonths(Number(e.target.value))} className="w-full" />
              </div>
            )}

            <Button onClick={() => setStep(1)} className="w-full">{language === "ar" ? "التالي" : "Next"}{nextIcon}</Button>
          </CardBody>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{language === "ar" ? "الخطوة 2 من 3" : "Step 2 of 3"}</div>
            <h2 className="mt-1 text-lg font-semibold">{language === "ar" ? "اختاري لغتك" : "Choose your language"}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setLanguage("en"); document.documentElement.dir = "ltr"; }} className={`rounded-lg border p-4 ${language === "en" ? "border-brand-400 bg-brand-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                <Languages className="mx-auto mb-3 text-brand-600" size={22} />
                <div className="font-medium">English</div>
                <div className="text-xs text-zinc-500">EN</div>
              </button>
              <button onClick={() => { setLanguage("ar"); document.documentElement.dir = "rtl"; }} className={`rounded-lg border p-4 ${language === "ar" ? "border-brand-400 bg-brand-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                <Languages className="mx-auto mb-3 text-brand-600" size={22} />
                <div className="font-medium">عربي</div>
                <div className="text-xs text-zinc-500">AR</div>
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">{backIcon}{language === "ar" ? "رجوع" : "Back"}</Button>
              <Button onClick={() => setStep(2)} className="flex-1">{language === "ar" ? "التالي" : "Next"}{nextIcon}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{language === "ar" ? "الخطوة 3 من 3" : "Step 3 of 3"}</div>
            <h2 className="mt-1 text-lg font-semibold">{language === "ar" ? "أين تعيشين؟" : "Where do you live?"}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <MapPin className="shrink-0 text-brand-600" size={20} />
              <select value={city} onChange={(e) => setCity(e.target.value as typeof City._type)} className="input-base px-3 py-2.5">
              <option value="dubai">Dubai (AED)</option>
              <option value="abu_dhabi">Abu Dhabi (AED)</option>
              <option value="riyadh">Riyadh (SAR)</option>
              <option value="jeddah">Jeddah (SAR)</option>
              <option value="doha">Doha (QAR)</option>
              <option value="kuwait_city">Kuwait City (KWD)</option>
              </select>
            </div>
            <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{language === "ar" ? `العملة: ${cityToCurrency(city)}` : `Currency: ${cityToCurrency(city)}`}</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">{backIcon}{language === "ar" ? "رجوع" : "Back"}</Button>
              <Button onClick={finish} className="flex-1">{language === "ar" ? "ابدئي" : "Get started"}{nextIcon}</Button>
            </div>
          </CardBody>
        </Card>
      )}
        </div>

        <aside className="premium-shell hidden overflow-hidden rounded-lg lg:block">
          <div className="surface-grid p-6">
            <div className="flex items-center justify-between">
              <Badge tone="brand">{language === "ar" ? "معاينة" : "Preview"}</Badge>
              <div className="text-xs font-medium text-zinc-500">{cityToCurrency(city)}</div>
            </div>
            <div className="mt-8">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{language === "ar" ? "المرحلة المحددة" : "Selected stage"}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-zinc-950 text-white">
                  {stage === "pregnancy" ? <CalendarHeart size={22} /> : <Baby size={22} />}
                </div>
                <div>
                  <div className="text-lg font-semibold text-zinc-950">{stage === "pregnancy" ? (language === "ar" ? "حامل" : "Pregnant") : (language === "ar" ? "طفل" : "Baby")}</div>
                  <div className="text-sm text-zinc-500">{stage === "pregnancy" ? (language === "ar" ? `الأسبوع ${pregnancyWeek}` : `Week ${pregnancyWeek}`) : (language === "ar" ? `الشهر ${childAgeMonths}` : `Month ${childAgeMonths}`)}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {[
                { icon: HeartPulse, label: language === "ar" ? "ملخص نمو أسبوعي" : "Weekly milestone brief" },
                { icon: ShoppingBag, label: language === "ar" ? "اختيارات منتجات مناسبة" : "Stage-fit product picks" },
                { icon: ShieldCheck, label: language === "ar" ? "حماية طبية وخارج النطاق" : "Medical and scope guardrails" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white/80 p-3 shadow-sm">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <Icon size={17} />
                    </div>
                    <div className="text-sm font-medium text-zinc-700">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-zinc-950 p-5 text-white">
            <div className="text-sm font-semibold">{language === "ar" ? "الخطوة التالية" : "Next"}</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">{language === "ar" ? "سيظهر ملخصك ولوحة الأدوات بعد الإعداد مباشرة." : "Your dashboard brief and tool entry points appear immediately after setup."}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
