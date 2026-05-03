/**
 * Language configuration and utilities for the Yafutzu Torah reader.
 * Shared between server and client; no browser APIs here.
 */

export const LANGUAGE_CONFIG = {
  he: { label: "עברית", nativeLabel: "עברית", dir: "rtl" as const },
  en: { label: "English", nativeLabel: "English", dir: "ltr" as const },
  it: { label: "Italiano", nativeLabel: "Italiano", dir: "ltr" as const },
} as const;

export type LangCode = keyof typeof LANGUAGE_CONFIG;

/** Languages we know how to display; anything else falls back to Hebrew. */
export const KNOWN_LANGS = Object.keys(LANGUAGE_CONFIG) as LangCode[];

export const DEFAULT_LANG: LangCode = "he";
export const LANG_STORAGE_KEY = "yafutzu-lang";

/** Return the label for a language code, falling back gracefully. */
export function langLabel(code: string): string {
  return (LANGUAGE_CONFIG as Record<string, { label: string }>)[code]?.label ?? code;
}

/**
 * Derive which translation languages are present in a verse array.
 * Hebrew is always included.
 */
export function detectLanguages(
  verses: { text: Record<string, string | undefined> }[]
): LangCode[] {
  const found = new Set<LangCode>(["he"]);
  for (const v of verses) {
    for (const code of KNOWN_LANGS) {
      if (code !== "he" && v.text[code]) found.add(code);
    }
  }
  return Array.from(found);
}
