"use client";

import { useState, useEffect } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  detectLanguages,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  LANGUAGE_CONFIG,
  type LangCode,
} from "@/lib/language";

interface Verse {
  number: number;
  text: {
    he: string;
    he_plain?: string;
    en?: string;
    it?: string;
  };
}

interface ChapterReaderProps {
  book: { slug: string; title: { he: string; en: string } };
  chapter: {
    number: number;
    title?: { he?: string; en?: string };
    totalChapters: number;
  };
  verses: Verse[];
}

export function ChapterReader({
  book,
  chapter,
  verses,
}: ChapterReaderProps) {
  const available = detectLanguages(
    verses.map((v) => ({ text: v.text as Record<string, string | undefined> }))
  );

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  // Hydrate language from localStorage on mount
  useEffect(() => {
    const stored = (localStorage.getItem(LANG_STORAGE_KEY) ?? DEFAULT_LANG) as LangCode;
    // Use stored language only if this text has a translation for it
    setLang(available.includes(stored) ? stored : DEFAULT_LANG);
    setMounted(true);
  }, [available.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLangChange = (newLang: LangCode) => {
    setLang(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  const showingHebrew = lang === "he";
  const translationDir = LANGUAGE_CONFIG[lang]?.dir ?? "ltr";

  // Prev / Next chapter links
  const prevChap = chapter.number > 1 ? chapter.number - 1 : null;
  const nextChap = chapter.number < chapter.totalChapters ? chapter.number + 1 : null;
  const baseHref = `/texts/rambam/${book.slug}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <a
            href={baseHref}
            className="text-sm text-stone-500 hover:text-stone-700 mb-1 inline-block"
          >
            ← {book.title.en}
          </a>
          <h1 className="text-2xl font-bold text-stone-900">
            Chapter {chapter.number}
            {chapter.title?.en && (
              <span className="ml-2 text-stone-500 font-normal text-lg">
                — {chapter.title.en}
              </span>
            )}
          </h1>
          {chapter.title?.he && (
            <p className="text-base text-stone-500 mt-0.5" dir="rtl">
              {chapter.title.he}
            </p>
          )}
        </div>

        {/* Language switcher — only shown after hydration to avoid flicker */}
        {mounted && available.length > 1 && (
          <div className="flex-shrink-0 pt-1">
            <LanguageSwitcher
              available={available}
              current={lang}
              onChange={handleLangChange}
            />
          </div>
        )}
      </div>

      {/* ── Verse list ── */}
      <div className="space-y-6">
        {verses.map((verse) => {
          const translation = (verse.text as Record<string, string | undefined>)[lang];
          const hasTranslation = !showingHebrew && !!translation;

          return (
            <div
              key={verse.number}
              className="group"
            >
              <div className="flex gap-3">
                {/* Verse number */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {verse.number}
                </span>

                <div className="flex-1 space-y-2">
                  {/* Hebrew */}
                  <p
                    className="leading-8 text-stone-800 font-[SBL_Hebrew,David,serif]"
                    dir="rtl"
                    lang="he"
                  >
                    {verse.text.he}
                  </p>

                  {/* Translation (if language ≠ Hebrew and translation exists) */}
                  {hasTranslation && (
                    <p
                      className="leading-relaxed text-stone-700 border-t border-stone-100 pt-2"
                      dir={translationDir}
                      lang={lang}
                    >
                      {translation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chapter navigation ── */}
      <div className="flex justify-between items-center mt-12 pt-6 border-t border-stone-200">
        {prevChap ? (
          <a
            href={`${baseHref}/${prevChap}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
          >
            ← Chapter {prevChap}
          </a>
        ) : (
          <div />
        )}
        <a
          href={baseHref}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          All chapters
        </a>
        {nextChap ? (
          <a
            href={`${baseHref}/${nextChap}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
          >
            Chapter {nextChap} →
          </a>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
