"use client";

import { useState, useEffect } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GlossedItalian, type GlossaryTerm } from "@/components/GlossedItalian";
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  LANGUAGE_CONFIG,
  type LangCode,
} from "@/lib/language";

interface Halacha {
  n: number;
  he: string;
  it: string;
}

interface Props {
  sefariaRef: string;
  name_he: string;
  name_it: string;
  date?: string;
  halachot: Halacha[];
  glossary: Record<string, GlossaryTerm>;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

const AVAILABLE: LangCode[] = ["he", "it"];

export function ItDemoReader({
  sefariaRef,
  name_he,
  name_it,
  date,
  halachot,
  glossary,
  prevSlug,
  nextSlug,
}: Props) {
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(LANG_STORAGE_KEY) ?? DEFAULT_LANG) as LangCode;
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
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <a
            href="/it-demo"
            className="text-sm text-stone-500 hover:text-stone-700 mb-1 inline-block"
          >
            ← Tutti i testi tradotti
          </a>
          <h1 className="text-2xl font-bold text-stone-900">
            {showHebrew ? name_he : name_it}
          </h1>
          {showHebrew && name_it && (
            <p className="text-base text-stone-500 mt-0.5">{name_it}</p>
          )}
          {!showHebrew && name_he && (
            <p className="text-base text-stone-500 mt-0.5" dir="rtl" lang="he">
              {name_he}
            </p>
          )}
          {date && (
            <p className="text-xs text-stone-400 mt-1">
              Studio quotidiano del {date}
            </p>
          )}
          <p className="text-xs text-stone-400 mt-1 italic">
            Sorgente: <code>{sefariaRef}</code> · {halachot.length} halachot
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

      <div className="space-y-6">
        {halachot.map((h) => (
          <div key={h.n} className="group">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                {h.n}
              </span>
              <div className="flex-1 space-y-2">
                {showHebrew ? (
                  <p
                    className="leading-8 text-stone-800 font-[SBL_Hebrew,David,serif]"
                    dir="rtl"
                    lang="he"
                  >
                    {h.he}
                  </p>
                ) : showItalian ? (
                  <p
                    className="leading-relaxed text-stone-700"
                    dir={dir}
                    lang="it"
                  >
                    <GlossedItalian text={h.it} glossary={glossary} />
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-stone-200">
        {prevSlug ? (
          <a
            href={`/it-demo/${prevSlug}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
          >
            ← Precedente
          </a>
        ) : (
          <div />
        )}
        <a href="/it-demo" className="text-sm text-stone-400 hover:text-stone-600">
          Indice
        </a>
        {nextSlug ? (
          <a
            href={`/it-demo/${nextSlug}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
          >
            Successivo →
          </a>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
