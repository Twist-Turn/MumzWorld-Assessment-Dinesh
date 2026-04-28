"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Baby, Camera, FlaskConical, Languages, ListChecks, MapPin, MessageSquare, Mic, Sparkles } from "lucide-react";
import { loadProfile, saveProfile } from "@/lib/profile-client";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label_en: "Home", label_ar: "الرئيسية", icon: Sparkles },
  { href: "/chat", label_en: "Chat", label_ar: "محادثة", icon: MessageSquare },
  { href: "/voice", label_en: "Voice", label_ar: "صوت", icon: Mic },
  { href: "/photo", label_en: "Photo", label_ar: "صورة", icon: Camera },
  { href: "/checklists", label_en: "Lists", label_ar: "قوائم", icon: ListChecks },
  { href: "/evals", label_en: "Evals", label_ar: "تقييم", icon: FlaskConical },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (typeof document !== "undefined" && p) document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
  }, [pathname]);

  if (!profile) return null;

  const lang = profile.language;
  const toggleLang = () => {
    const next = { ...profile, language: profile.language === "en" ? "ar" : "en" } as Profile;
    saveProfile(next);
    setProfile(next);
    document.documentElement.dir = next.language === "ar" ? "rtl" : "ltr";
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-950 text-white shadow-sm shadow-zinc-900/20 ring-1 ring-white/20">
            <Baby size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold tracking-tight text-zinc-950">
              {lang === "ar" ? "رفيقة ممزورلد" : "Mumzworld Companion"}
            </span>
            <span className="hidden text-xs text-zinc-500 sm:block">
              {lang === "ar" ? "إرشاد مرحلي مدعوم بالذكاء الاصطناعي" : "Stage-aware AI for GCC moms"}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-md border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm md:inline-flex">
            <MapPin size={13} />
            {profile.city.replace("_", " ")} · {profile.currency}
          </div>
          <button onClick={toggleLang} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            <Languages size={14} />
            {lang === "ar" ? "EN" : "عربي"}
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8 scrollbar-thin">
        <div className="inline-flex gap-1 rounded-lg border border-zinc-200/90 bg-white/80 p-1 shadow-sm">
        {ITEMS.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex min-h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              )}
            >
              <Icon size={14} />
              {lang === "ar" ? it.label_ar : it.label_en}
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
