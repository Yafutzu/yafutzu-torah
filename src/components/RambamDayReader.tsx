"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GlossedItalian, type GlossaryTerm } from "@/components/GlossedItalian";
import TorahBreadcrumb from "@/components/TorahBreadcrumb";
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  LANGUAGE_CONFIG,
  type LangCode,
} from "@/lib/language";

interface Halacha {
  n: number;
  he: string;
  it?: string;
}

interface Perek {
  ref: string;
  englishName: string;
  name_he?: string;
  name_it?: string;
  halachot: Halacha[];
  hasItalian: boolean;
}

interface Props {
  gregorian: string;
  hebrew: { day: number; month: string; year: number };
  perakim: Perek[];
  glossary: Record<string, GlossaryTerm>;
  prevDate: string;
  nextDate: string;
}

const AVAILABLE: LangCode[] = ["he", "it"];

export function RambamDayReader({
  gregorian,
  hebrew,
  perakim,
  glossary,
  prevDate,
  nextDate,
}: Props) {
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(LANG_STORAGE_KEY) ??
      DEFAULT_LANG) as LangCode;
    setLang(AVAILABLE.includes(stored) ? stored : DEFAULT_LANG);
    setMounted(true);
  }, []);

  const handleLang = (l: LangCode) => {
    setLang(l);
    localStorage.setItem(LANG_STORAGE_KEY, l);
  };

  const showHebrew = lang === "he";
  const showItalian = lang === "it";
  const dir = LANGUAGE_CONFIG[lang]?.dir ?? "ltr";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Wayfinding breadcrumb (top of every Torah text page) */}
      <TorahBreadcrumb
        trail={[
          { label: "Yafutzu Torah", href: "/" },
          { label: "Rambam", href: "/rambam/today" },
          { label: gregorian },
        ]}
      />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            {showHebrew ? "רמב״ם יומי — שלושה פרקים" : "Rambam quotidiano · 3 perakim"}
          </h1>
          <p className="text-base text-stone-500 mt-1">
            {showHebrew
              ? `${hebrew.day} ${hebrew.month} ${hebrew.year}`
              : `${gregorian} · ${hebrew.day} ${hebrew.month} ${hebrew.year}`}
          </p>
        </div>

        {mounted && (
          <div className="flex-shrink-0 pt-1">
            <LanguageSwitcher
              available={AVAILABLE}
              current={lang}
              onChange={handleLang}
            />
          </div>
        )}
      </div>

      {perakim.map((p, idx) => (
        <section key={p.ref} className="mb-12">
          <header className="mb-4 pb-2 border-b-2 border-amber-200">
            <h2 className="text-xl font-bold text-stone-900">
              {showHebrew && p.name_he ? p.name_he : p.englishName}
            </h2>
            {showItalian && p.name_it ? (
              <p className="text-sm text-stone-500 mt-0.5">{p.name_it}</p>
            ) : null}
            <p className="text-xs text-stone-400 mt-1">
              {showItalian
                ? p.hasItalian
                  ? `Capitolo ${idx + 1} di 3 · traduzione italiana disponibile`
                  : `Capitolo ${idx + 1} di 3 · traduzione italiana non ancora disponibile`
                : `${p.englishName} · ${p.halachot.length} halachot`}
            </p>
          </header>

          {showItalian && !p.hasItalian && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 text-sm text-amber-900">
              La traduzione italiana di questo capitolo non è ancora pronta. Sotto è
              mostrato solo il testo ebraico.
            </div>
          )}

          <div className="space-y-5">
            {p.halachot.map((h) => {
              const showItHere = showItalian && h.it;
              const showHeHere = showHebrew || (showItalian && !h.it);
              return (
                <div key={h.n} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {h.n}
                  </span>
                  <div className="flex-1 space-y-2">
                    {showHeHere && h.he && (
                      <p
                        className="leading-8 text-stone-800 font-[SBL_Hebrew,David,serif]"
                        dir="rtl"
                        lang="he"
                      >
                        {h.he}
                      </p>
                    )}
                    {showItHere && (
                      <p
                        className="leading-relaxed text-stone-700"
                        dir={dir}
                        lang="it"
                      >
                        <GlossedItalian text={h.it!} glossary={glossary} />
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-stone-200">
        <a
          href={`/rambam/${prevDate}`}
          className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
        >
          ← {showItalian ? "Giorno precedente" : "Previous day"}
        </a>
        <a
          href="/rambam/today"
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          {showItalian ? "Oggi" : "Today"}
        </a>
        <a
          href={`/rambam/${nextDate}`}
          className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
        >
          {showItalian ? "Giorno successivo" : "Next day"} →
        </a>
      </div>
    </div>
  );
}
