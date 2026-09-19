"use client";
import { useMemo } from "react";
import { useLocaleStore, type Locale } from "@/store/locale";
import { en_base, uz_base, ru_base } from "./base";
import { en_a, uz_a, ru_a } from "./batchA";
import { en_b, uz_b, ru_b } from "./batchB";
import { en_c, uz_c, ru_c } from "./batchC";

// Batch lug'atlar bitta jadvalga birlashadi (kalitlar prefiks bilan unikal:
// nav.*, side.*, home.*, upload.*, ...). Topilmasa inglizcha, u ham
// bo'lmasa kalitning o'zi qaytadi.
type Flat = Record<string, string>;

const dicts: Record<Locale, Flat> = {
  en: { ...en_base, ...en_a, ...en_b, ...en_c },
  uz: { ...uz_base, ...uz_a, ...uz_b, ...uz_c },
  ru: { ...ru_base, ...ru_a, ...ru_b, ...ru_c },
};

export function tFor(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const d = dicts[locale] ?? dicts.en;
  let s = d[key] ?? dicts.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

// Sanoqli otlar: ru one/few/many (1, 2–4, 5+), en/uz — bitta shakl + {n}.
// Lug'atda: `<base>` (en/uz, ichida {n}) + `<base>_one|_few|_many` (ru).
function ruForm(n: number): "one" | "few" | "many" {
  const m10 = Math.abs(n) % 10;
  const m100 = Math.abs(n) % 100;
  if (m10 === 1 && m100 !== 11) return "one";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "few";
  return "many";
}

export function tpFor(
  locale: Locale,
  base: string,
  n: number,
  vars?: Record<string, string | number>
): string {
  if (locale === "ru") {
    return tFor(locale, `${base}_${ruForm(n)}`, { n, ...vars });
  }
  return tFor(locale, base, { n, ...vars });
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(
    () => ({
      locale,
      t: (key: string, vars?: Record<string, string | number>) => tFor(locale, key, vars),
      tp: (base: string, n: number, vars?: Record<string, string | number>) =>
        tpFor(locale, base, n, vars),
    }),
    [locale]
  );
}
