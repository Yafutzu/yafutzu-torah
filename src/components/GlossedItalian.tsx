"use client";

import { useState, useMemo, useRef, useEffect } from "react";

export interface GlossaryTerm {
  key: string;
  aliases: string[];
  he: string;
  literal: string;
  short: string;
  long: string;
}

interface GlossedItalianProps {
  text: string;
  glossary: Record<string, GlossaryTerm>;
}

/**
 * Render Italian text with halachic transliterations turned into clickable
 * spans. Click reveals a popup with Hebrew, literal meaning, short summary,
 * and long definition pulled from the glossary.
 *
 * Matching is whole-word, case-insensitive, on `key` plus `aliases`.
 * Longer terms are matched before shorter to avoid partial overlap.
 */
export function GlossedItalian({ text, glossary }: GlossedItalianProps) {
  const [active, setActive] = useState<{ key: string; rect: DOMRect } | null>(
    null
  );
  const containerRef = useRef<HTMLSpanElement>(null);

  // Build a single regex from all terms + aliases, longest first
  const { regex, lookup } = useMemo(() => {
    const all: Array<{ pattern: string; key: string }> = [];
    for (const [key, term] of Object.entries(glossary)) {
      for (const alias of term.aliases) {
        all.push({ pattern: alias, key });
      }
    }
    // Longest first to avoid partial matches
    all.sort((a, b) => b.pattern.length - a.pattern.length);
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const grouped = all.map((x) => escape(x.pattern)).join("|");
    // Use Unicode word boundaries via lookbehind/ahead on letters; fallback to \b
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])(${grouped})(?![\\p{L}\\p{N}])`,
      "giu"
    );
    // Lookup by lowercased pattern → glossary key
    const lk: Record<string, string> = {};
    for (const x of all) lk[x.pattern.toLowerCase()] = x.key;
    return { regex: re, lookup: lk };
  }, [glossary]);

  // Tokenize once per text
  const tokens = useMemo(() => {
    if (!text) return [];
    const out: Array<
      { type: "text"; value: string } | { type: "term"; value: string; key: string }
    > = [];
    let last = 0;
    for (const m of text.matchAll(regex)) {
      const start = m.index ?? 0;
      if (start > last) {
        out.push({ type: "text", value: text.slice(last, start) });
      }
      const key = lookup[m[0].toLowerCase()];
      out.push({ type: "term", value: m[0], key });
      last = start + m[0].length;
    }
    if (last < text.length) {
      out.push({ type: "text", value: text.slice(last) });
    }
    return out;
  }, [text, regex, lookup]);

  // Close popover on outside click / escape
  useEffect(() => {
    if (!active) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActive(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const activeTerm = active && glossary[active.key];

  return (
    <span ref={containerRef} className="relative">
      {tokens.map((t, i) =>
        t.type === "text" ? (
          <span key={i}>{t.value}</span>
        ) : (
          <button
            key={i}
            type="button"
            data-glossary-term={t.key}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded px-0.5 underline decoration-dotted underline-offset-2 cursor-help"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setActive(active?.key === t.key ? null : { key: t.key, rect });
            }}
          >
            {t.value}
          </button>
        )
      )}

      {active && activeTerm && (
        <span
          role="tooltip"
          className="fixed z-50 max-w-sm w-80 bg-white border border-stone-200 rounded-lg shadow-xl p-4 text-sm text-stone-800"
          style={{
            top: Math.min(active.rect.bottom + 8, window.innerHeight - 240),
            left: Math.max(
              8,
              Math.min(active.rect.left, window.innerWidth - 336)
            ),
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div
                className="text-base font-bold text-stone-900"
                lang="he"
                dir="rtl"
              >
                {activeTerm.he}
              </div>
              <div className="text-xs text-stone-500 italic mt-0.5">
                {activeTerm.literal}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActive(null);
              }}
              className="text-stone-400 hover:text-stone-700 leading-none text-lg"
              aria-label="Chiudi"
            >
              ×
            </button>
          </div>
          <div className="font-medium text-stone-800 mb-1">
            {activeTerm.short}
          </div>
          <div className="text-stone-600 leading-snug">{activeTerm.long}</div>
        </span>
      )}
    </span>
  );
}
