"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadProfile } from "@/lib/profile-client";
import { t } from "@/lib/i18n";
import type { Profile, ShoppingListResponse } from "@/lib/types";
import { AlertCircle, CalendarDays, FileText, Loader2, Mic, Package, ShoppingCart, Square, Upload } from "lucide-react";

export default function VoicePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ShoppingListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/onboarding"); return; }
    setProfile(p);
    document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
  }, [router]);

  if (!profile) return null;
  const lang = profile.language;

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      setError(`${(e as Error).message}. ${lang === "ar" ? "تأكدي من السماح بالميكروفون." : "Make sure microphone permission is granted."}`);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!audioBlob) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("profile", JSON.stringify(profile));
      fd.append("audio", audioBlob, "memo.webm");
      const r = await fetch("/api/voice", { method: "POST", body: fd });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const data = await r.json() as ShoppingListResponse;
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <Badge tone="brand"><Mic size={12} />{t("Voice input", "إدخال صوتي", lang)}</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{t("Voice memo to shopping list", "من التسجيل الصوتي إلى قائمة تسوق", lang)}</h1>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t("Record or upload a memo in English or Arabic. The companion transcribes it, extracts items, and matches catalog products.", "سجّلي أو ارفعي ملاحظة بالعربية أو الإنجليزية. الرفيقة تفرّغها وتستخرج العناصر وتطابقها مع الكتالوج.", lang)}
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className={`rounded-lg border p-4 ${recording ? "border-red-200 bg-red-50" : "border-zinc-200 bg-zinc-50"}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-800">{t("Memo source", "مصدر الملاحظة", lang)}</div>
                {recording ? <Badge tone="danger">{t("Recording", "تسجيل", lang)}</Badge> : <Badge tone="neutral">{t("Ready", "جاهز", lang)}</Badge>}
              </div>
              <div className="flex flex-col gap-2">
                {!recording ? (
                  <Button onClick={start} variant="primary" size="lg"><Mic size={18} />{t("Start recording", "ابدئي التسجيل", lang)}</Button>
                ) : (
                  <Button onClick={stop} variant="danger" size="lg"><Square size={18} />{t("Stop", "إيقاف", lang)}</Button>
                )}
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                  <Upload size={16} />
                  {t("Upload audio file", "ارفعي ملفاً صوتياً", lang)}
                  <input type="file" accept="audio/*" onChange={onUpload} className="hidden" />
                </label>
              </div>
            </div>
            {audioUrl ? <audio src={audioUrl} controls className="w-full" /> : null}
            {audioBlob ? (
              <Button onClick={submit} disabled={submitting} variant="secondary" className="w-full">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                {submitting ? t("Transcribing and extracting…", "جاري التفريغ والاستخراج…", lang) : t("Build shopping list", "أنشئي قائمة التسوق", lang)}
              </Button>
            ) : null}
            {error ? <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={16} />{error}</div> : null}
          </CardBody>
        </Card>

      {result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("Extraction result", "نتيجة الاستخراج", lang)}</div>
                <h2 className="mt-1 text-lg font-semibold">{t("Structured shopping list", "قائمة تسوق منظمة", lang)}</h2>
              </div>
              <Badge tone="success">{result.items.length} {t("items", "عناصر", lang)}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500"><FileText size={12} />{t("Transcript", "النص المفرَّغ", lang)}</div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">{result.transcript || <span className="text-zinc-400">-</span>}</div>
            </div>
            {result.refusal ? (
              <div className="text-amber-700 text-sm">{lang === "ar" ? result.refusal.message_ar : result.refusal.message_en}</div>
            ) : (
              <>
                <div className="grid gap-2">
                  {result.items.map((it, i) => (
                    <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm">{it.name_raw}</div>
                        <Badge tone={it.confidence === "high" ? "success" : it.confidence === "medium" ? "info" : "warning"}>{it.confidence}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 flex flex-wrap gap-2">
                        <Badge tone="neutral">{it.category}</Badge>
                        {it.matched_product_id ? <Badge tone="brand"><Package size={11} />{it.matched_product_id}</Badge> : <Badge tone="warning">{t("no catalog match", "بدون تطابق", lang)}</Badge>}
                        {it.due_date_iso ? <Badge tone="info"><CalendarDays size={11} />{it.due_date_iso}</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
          <ShoppingCart className="mx-auto text-zinc-300" size={34} />
          <div className="mt-3 text-sm font-medium text-zinc-700">{t("Your extracted list will appear here", "ستظهر قائمتك المستخرجة هنا", lang)}</div>
          <div className="mt-1 text-xs text-zinc-500">{t("Use a short memo with product names, quantities, or due dates.", "استخدمي ملاحظة قصيرة بأسماء المنتجات أو الكميات أو المواعيد.", lang)}</div>
        </div>
      )}
      </div>
    </div>
  );
}
