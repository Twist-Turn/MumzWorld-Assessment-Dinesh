"use client";

import type { Profile } from "./types";

const KEY = "mumzworld_profile_v1";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function setLanguage(p: Profile, language: "en" | "ar"): Profile {
  const next = { ...p, language };
  saveProfile(next);
  return next;
}
