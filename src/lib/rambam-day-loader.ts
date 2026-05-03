import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { HDate } from "@hebcal/core";
import { dailyRambam3 } from "@hebcal/learning";

const TRANS_DIR = path.join(process.cwd(), "data", "raw", "translations", "it");

export interface RambamHalacha {
  n: number;
  he: string;
  it?: string;
}

export interface RambamPerek {
  ref: string;
  englishName: string;
  perek: number;
  name_he?: string;
  name_it?: string;
  halachot: RambamHalacha[];
  hasItalian: boolean;
  sourceFile?: string;
  sefariaError?: string;
}

export interface RambamDay {
  gregorian: string;
  hebrew: { day: number; month: string; year: number };
  perakim: RambamPerek[];
}

const SEFARIA_BASE = "https://www.sefaria.org/api/v3/texts";

interface ItalianFile {
  ref: string;
  name_he?: string;
  name_it?: string;
  halachot: { n: number; he: string; it: string }[];
}

let italianIndexCache:
  | Map<string, { file: string; data: ItalianFile }>
  | null = null;

/** Build an in-memory map: Sefaria ref → matching Italian translation file. */
function loadItalianIndex(): Map<string, { file: string; data: ItalianFile }> {
  if (italianIndexCache) return italianIndexCache;
  const m = new Map<string, { file: string; data: ItalianFile }>();
  if (!existsSync(TRANS_DIR)) {
    italianIndexCache = m;
    return m;
  }
  for (const f of readdirSync(TRANS_DIR)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    const full = path.join(TRANS_DIR, f);
    try {
      const data = JSON.parse(readFileSync(full, "utf8"));
      // Single-perek files have `ref` at the top level
      if (data.ref && Array.isArray(data.halachot)) {
        m.set(data.ref, { file: f, data });
      }
      // Multi-perek aggregated file (e.g. 2026-05-03-rambam3.json)
      if (Array.isArray(data.perakim)) {
        for (const p of data.perakim) {
          if (
            p.ref &&
            Array.isArray(p.halachot) &&
            p.halachot.length > 0 &&
            !m.has(p.ref)
          ) {
            m.set(p.ref, { file: f, data: p });
          }
        }
      }
    } catch {
      // skip malformed
    }
  }
  italianIndexCache = m;
  return m;
}

async function fetchSefariaHebrew(
  ref: string
): Promise<{ segments: string[]; error?: string }> {
  const url = `${SEFARIA_BASE}/${encodeURIComponent(
    ref.replace(/ /g, "_")
  )}?version=hebrew`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Yafutzu-Torah/1.0 (+https://yafutzu.org)" },
      // Cache for 24 hours — daily content doesn't change
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return { segments: [], error: `HTTP ${res.status}` };
    const j: { error?: string; versions?: { language: string; text: unknown }[] } =
      await res.json();
    if (j.error) return { segments: [], error: j.error };
    const heVer = (j.versions ?? []).find((v) => v.language === "he");
    if (!heVer) return { segments: [], error: "no hebrew version" };
    const flat: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === "string") flat.push(x);
      else if (Array.isArray(x)) for (const c of x) walk(c);
    };
    walk(heVer.text);
    return { segments: flat };
  } catch (e) {
    return { segments: [], error: (e as Error).message };
  }
}

export function parseDateYMD(ymd: string): Date | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10)
  );
  return isNaN(d.getTime()) ? null : d;
}

export async function loadRambamDay(date: Date): Promise<RambamDay> {
  const hd = new HDate(date);
  const dayList = dailyRambam3(hd) || [];

  const italian = loadItalianIndex();
  const perakim: RambamPerek[] = [];

  for (const entry of dayList) {
    const ref = `Mishneh Torah, ${entry.name} ${entry.perek}`;
    const it = italian.get(ref);

    const heResult = await fetchSefariaHebrew(ref);
    const heSegs = heResult.segments;

    const itHalachot: RambamHalacha[] = [];
    if (it) {
      // Use Italian halachot, with Hebrew from same file as fallback to Sefaria
      const itHs = it.data.halachot;
      const len = Math.max(itHs.length, heSegs.length);
      for (let i = 0; i < len; i++) {
        const itH = itHs[i];
        itHalachot.push({
          n: itH?.n ?? i + 1,
          he: heSegs[i] ?? itH?.he ?? "",
          it: itH?.it,
        });
      }
    } else {
      for (let i = 0; i < heSegs.length; i++) {
        itHalachot.push({ n: i + 1, he: heSegs[i] });
      }
    }

    perakim.push({
      ref,
      englishName: `${entry.name} ${entry.perek}`,
      perek: entry.perek,
      name_he: it?.data.name_he,
      name_it: it?.data.name_it,
      halachot: itHalachot,
      hasItalian: !!it,
      sourceFile: it?.file,
      sefariaError: heResult.error,
    });
  }

  return {
    gregorian: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`,
    hebrew: {
      day: hd.getDate(),
      month: hd.getMonthName(),
      year: hd.getFullYear(),
    },
    perakim,
  };
}
