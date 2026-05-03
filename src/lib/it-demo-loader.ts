import { readFileSync, readdirSync } from "fs";
import path from "path";

const TRANS_DIR = path.join(process.cwd(), "data", "raw", "translations", "it");

export interface ItHalacha {
  n: number;
  he: string;
  it: string;
}

export interface ItPerek {
  fileSlug: string;
  ref: string;
  name_he: string;
  name_it: string;
  halachot_count: number;
  halachot: ItHalacha[];
  date?: string;
}

export interface ItGlossary {
  _meta: { purpose: string; matchingPolicy: string; frontendHint: string };
  terms: Record<
    string,
    {
      key: string;
      aliases: string[];
      he: string;
      literal: string;
      short: string;
      long: string;
    }
  >;
}

/** List all per-perek translation files (excluding the unified day files). */
export function listPerekFiles(): { slug: string; ref: string; date?: string }[] {
  const files = readdirSync(TRANS_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_") && /-(fi|fr|ff)\d+/.test(f)
  );
  const out: { slug: string; ref: string; date?: string }[] = [];
  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    const data = JSON.parse(readFileSync(path.join(TRANS_DIR, f), "utf8"));
    out.push({
      slug,
      ref: data.ref ?? slug,
      date: slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function loadPerek(slug: string): ItPerek | null {
  const file = path.join(TRANS_DIR, `${slug}.json`);
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return {
      fileSlug: slug,
      ref: data.ref ?? slug,
      name_he: data.name_he ?? "",
      name_it: data.name_it ?? "",
      halachot_count: data.halachot_count ?? data.halachot?.length ?? 0,
      halachot: data.halachot ?? [],
      date: slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    };
  } catch {
    return null;
  }
}

let glossaryCache: ItGlossary | null = null;
export function loadGlossary(): ItGlossary {
  if (glossaryCache) return glossaryCache;
  glossaryCache = JSON.parse(
    readFileSync(path.join(TRANS_DIR, "_glossary.json"), "utf8")
  ) as ItGlossary;
  return glossaryCache;
}
