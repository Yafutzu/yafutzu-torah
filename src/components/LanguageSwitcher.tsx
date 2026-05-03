"use client";

import { LANGUAGE_CONFIG, type LangCode } from "@/lib/language";

interface Props {
  available: LangCode[];
  current: LangCode;
  onChange: (lang: LangCode) => void;
}

export function LanguageSwitcher({ available, current, onChange }: Props) {
  if (available.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
      {available.map((code) => {
        const cfg = LANGUAGE_CONFIG[code];
        const active = code === current;
        return (
          <button
            key={code}
            onClick={() => onChange(code)}
            className={[
              "px-3 py-1 text-sm font-medium rounded-md transition-all",
              active
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            ].join(" ")}
            dir={cfg.dir}
            aria-pressed={active}
            title={cfg.nativeLabel}
          >
            {cfg.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
