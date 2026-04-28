export function toArabicNumerals(s: string | number): string {
  const map: Record<string, string> = { "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤", "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩" };
  return String(s).replace(/[0-9]/g, (d) => map[d] ?? d);
}

export function formatPrice(amount: number, currency: string, language: "en" | "ar"): string {
  if (language === "ar") return `${toArabicNumerals(amount)} ${currency === "AED" ? "د.إ" : currency === "SAR" ? "ر.س" : currency === "QAR" ? "ر.ق" : "د.ك"}`;
  return `${currency} ${amount}`;
}

export const t = (en: string, ar: string, lang: "en" | "ar") => (lang === "ar" ? ar : en);
