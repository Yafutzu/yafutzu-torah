/**
 * dach.dev scraper (offline backup — DO NOT SHIP without permission from
 * Hadar HaTorah / Kehot. See OUTREACH_DACH_DEV.md for the partnership path).
 *
 * Pulls Likkutei Sichos (39 volumes) from the public Firestore project
 * `dach-dev`. The site uses an unrestricted Firebase Web SDK key — same
 * endpoints the browser hits. We're not bypassing auth.
 *
 * Output: data/raw/_offline/dach-dev/likkutei-sichos.json
 *   {
 *     source: "dach.dev (Hadar HaTorah)",
 *     license: "see Kehot — UNRESOLVED, do not redistribute",
 *     volumes: [{
 *       volume: 1,
 *       toc: [...],
 *       sichos: [{ id, page, volume, parsha, title, mainText, footnotes }]
 *     }]
 *   }
 *
 * Usage:
 *   npx tsx scripts/scrape-dach-dev.ts                 (all 39 volumes)
 *   VOLUMES=1,2,3 npx tsx scripts/scrape-dach-dev.ts   (subset)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const FB_KEY = process.env.FB_KEY ?? (() => { throw new Error("FB_KEY env var required"); })();
const FB_PROJECT = "dach-dev";
const FB_BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;
const THROTTLE_MS = Number(process.env.DACH_THROTTLE_MS ?? 250);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Convert Firestore REST `fields` shape to plain JS values. */
function unwrap(v: any): any {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) {
    const out: Record<string, unknown> = {};
    for (const [k, w] of Object.entries(v.mapValue.fields ?? {})) {
      out[k] = unwrap(w);
    }
    return out;
  }
  if ("arrayValue" in v) {
    return (v.arrayValue.values ?? []).map(unwrap);
  }
  return null;
}

async function fbGet(docPath: string): Promise<any | null> {
  const url = `${FB_BASE}/${docPath}?key=${FB_KEY}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Yafutzu-Offline/1.0" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${docPath}`);
  }
  const j = await res.json();
  if (!j.fields) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(j.fields)) out[k] = unwrap(v);
  return out;
}

interface Sicha {
  id: string;
  page?: number;
  volume?: number;
  parsha?: string;
  title?: string;
  mainText?: string;
  footnotes?: string;
}

interface VolumeOut {
  volume: number;
  tocCount: number;
  sichosCount: number;
  sichos: Sicha[];
}

interface BookOut {
  source: string;
  attribution: string;
  notes: string;
  scrapedAt: string;
  totalVolumes: number;
  totalSichos: number;
  volumes: VolumeOut[];
}

async function scrapeVolume(vol: number): Promise<VolumeOut> {
  const tocDoc = await fbGet(`books/likkuteiSichos/tocByVolume/${vol}`);
  if (!tocDoc) {
    return { volume: vol, tocCount: 0, sichosCount: 0, sichos: [] };
  }

  // Each top-level key (0..N) is a TOC entry
  const entries = Object.values(tocDoc) as Array<{
    page?: number;
    volume?: number;
    title?: string;
    summary?: string;
    parsha?: string;
    isPublic?: boolean;
  }>;
  // Sort by page for consistency
  entries.sort((a, b) => (a.page ?? 0) - (b.page ?? 0));

  const sichos: Sicha[] = [];
  for (const e of entries) {
    if (!e.page) continue;
    const id = `${e.page}_${e.volume ?? vol}`;
    let doc: any = null;
    try {
      doc = await fbGet(`books/likkuteiSichos/sichos/${id}`);
    } catch (err) {
      console.warn(`    ✖ ${id}: ${(err as Error).message}`);
    }
    if (doc) {
      sichos.push({
        id,
        page: doc.page ?? e.page,
        volume: doc.volume ?? e.volume ?? vol,
        parsha: doc.parsha ?? e.parsha,
        title: doc.title ?? e.title,
        mainText: doc.mainText,
        footnotes: doc.footnotes,
      });
    }
    await sleep(THROTTLE_MS);
  }

  return {
    volume: vol,
    tocCount: entries.length,
    sichosCount: sichos.length,
    sichos,
  };
}

async function main() {
  const volsArg = process.env.VOLUMES;
  const volumes = volsArg
    ? volsArg.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean)
    : Array.from({ length: 39 }, (_, i) => i + 1);

  const outDir = path.join(process.cwd(), "data", "raw", "_offline", "dach-dev");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "likkutei-sichos.json");

  let book: BookOut;
  if (existsSync(outFile)) {
    book = JSON.parse(readFileSync(outFile, "utf8"));
    console.log(
      `  ↩  resume: ${book.volumes.length} volumes already done (${book.totalSichos} sichos)`
    );
  } else {
    book = {
      source: "dach.dev (Hadar HaTorah)",
      attribution:
        "Likkutei Sichos by Rabbi Menachem M. Schneerson, the Lubavitcher Rebbe. Hosted at dach.dev.",
      notes:
        "OFFLINE BACKUP — DO NOT REDISTRIBUTE. Underlying text is Kehot copyrighted. Pursue partnership via OUTREACH_DACH_DEV.md before any user-facing use.",
      scrapedAt: new Date().toISOString(),
      totalVolumes: 0,
      totalSichos: 0,
      volumes: [],
    };
  }

  const done = new Set(book.volumes.map((v) => v.volume));

  for (const vol of volumes) {
    if (done.has(vol)) continue;
    console.log(`\n[Vol ${vol}/${volumes.length}] fetching TOC and sichos…`);
    try {
      const v = await scrapeVolume(vol);
      book.volumes.push(v);
      book.volumes.sort((a, b) => a.volume - b.volume);
      book.totalVolumes = book.volumes.length;
      book.totalSichos = book.volumes.reduce((a, x) => a + x.sichosCount, 0);
      writeFileSync(outFile, JSON.stringify(book, null, 0));
      console.log(
        `  ✅ Vol ${vol}: ${v.sichosCount}/${v.tocCount} sichos`
      );
    } catch (e) {
      console.error(`  ✖ Vol ${vol}: ${(e as Error).message}`);
    }
  }

  console.log(
    `\n=== DONE ===\n  ${book.totalVolumes} volumes, ${book.totalSichos} sichos\n  → ${path.relative(
      process.cwd(),
      outFile
    )}`
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
