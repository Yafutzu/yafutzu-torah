/**
 * Translation top-up pass.
 *
 * For every scraped book, re-fetch leaves where English coverage is < threshold
 * (default 95% of Hebrew segments). Uses `version=english|all` to pull every
 * English version Sefaria has and merges them per segment position — preferring
 * the first non-empty translation found.
 *
 * Idempotent. Only writes when there's a net improvement in English coverage.
 *
 * Usage:
 *   npx tsx scripts/topup-translations.ts                     (all categories)
 *   npx tsx scripts/topup-translations.ts chasidut            (one category)
 *   npx tsx scripts/topup-translations.ts chasidut tanya      (one book)
 *   THRESHOLD=0.5 npx tsx scripts/topup-translations.ts       (only top up <50%)
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";

const SEFARIA = "https://www.sefaria.org";
const THROTTLE_MS = Number(process.env.TOPUP_THROTTLE_MS ?? 350);
const THRESHOLD = Number(process.env.THRESHOLD ?? 0.95);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function countSegs(x: unknown): number {
  if (typeof x === "string") return x.trim() ? 1 : 0;
  if (Array.isArray(x)) return x.reduce<number>((a, b) => a + countSegs(b), 0);
  return 0;
}

function flatten(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) for (const c of x) flatten(c, out);
  return out;
}

/** Walk parallel-shaped nested arrays; return shape mirroring `he` filled from
 *  whichever en source has content at that position. */
function mergeEnglish(
  he: unknown,
  englishVersions: Array<{ text: unknown; title: string }>
): unknown {
  // Walk the he shape, look up the same path in each en version, take first non-empty
  const walk = (path: number[]): unknown => {
    let node: unknown = he;
    for (const idx of path) {
      if (Array.isArray(node)) node = node[idx];
      else return undefined;
    }
    if (typeof node === "string") {
      // leaf — find first non-empty en at same path
      for (const ver of englishVersions) {
        let ev: unknown = ver.text;
        let ok = true;
        for (const idx of path) {
          if (Array.isArray(ev)) ev = ev[idx];
          else {
            ok = false;
            break;
          }
        }
        if (ok && typeof ev === "string" && ev.trim()) return ev;
      }
      return "";
    }
    if (Array.isArray(node)) {
      return node.map((_, i) => walk([...path, i]));
    }
    return undefined;
  };
  return walk([]);
}

async function fetchJSON(url: string, attempt = 1): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Yafutzu-Torah/1.0 (+https://yafutzu.org)" },
  });
  if (!res.ok) {
    if (attempt < 4) {
      await sleep(800 * attempt);
      return fetchJSON(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function topupBook(filePath: string): Promise<{
  before: number;
  after: number;
  refetched: number;
}> {
  const book = JSON.parse(readFileSync(filePath, "utf8"));
  const leaves: Array<{ ref: string; he?: unknown; en?: unknown }> =
    book.leaves || [];
  if (!leaves.length) return { before: 0, after: 0, refetched: 0 };

  let before = 0;
  let after = 0;
  let refetched = 0;
  const enVersionsSeen = new Set<string>(
    book.versionTitles?.en ? [book.versionTitles.en] : []
  );

  for (const leaf of leaves) {
    const heCount = countSegs(leaf.he);
    const enCount = countSegs(leaf.en);
    before += enCount;

    if (!heCount || enCount / heCount >= THRESHOLD) {
      after += enCount;
      continue;
    }

    // Re-fetch with all English versions
    const url = `${SEFARIA}/api/v3/texts/${encodeURIComponent(
      leaf.ref.replace(/ /g, "_")
    )}?version=english|all`;
    let j: any;
    try {
      j = await fetchJSON(url);
    } catch (e) {
      console.warn(`    ✖ ${leaf.ref}: ${(e as Error).message}`);
      after += enCount;
      continue;
    }
    refetched++;

    const enVers = (j.versions || []).filter((v: any) => v.language === "en");
    if (!enVers.length) {
      after += enCount;
      await sleep(THROTTLE_MS);
      continue;
    }
    for (const v of enVers)
      if (v.versionTitle) enVersionsSeen.add(v.versionTitle);

    const merged = mergeEnglish(
      leaf.he,
      enVers.map((v: any) => ({ text: v.text, title: v.versionTitle }))
    );
    const mergedCount = countSegs(merged);

    // Keep whichever is better
    if (mergedCount > enCount) {
      leaf.en = merged;
      after += mergedCount;
    } else {
      after += enCount;
    }
    await sleep(THROTTLE_MS);
  }

  if (after > before) {
    book.segmentCount = leaves.reduce(
      (a, l) => a + countSegs(l.he),
      0
    );
    book.englishVersions = Array.from(enVersionsSeen);
    book.toppedUpAt = new Date().toISOString();
    writeFileSync(filePath, JSON.stringify(book, null, 0));
  }

  return { before, after, refetched };
}

async function main() {
  const [, , catArg, bookArg] = process.argv;
  const dataRoot = path.join(process.cwd(), "data", "raw");

  const cats = catArg
    ? [catArg]
    : readdirSync(dataRoot).filter((c) =>
        existsSync(path.join(dataRoot, c))
      );

  let grandBefore = 0;
  let grandAfter = 0;
  let grandRefetched = 0;
  for (const cat of cats) {
    const catDir = path.join(dataRoot, cat);
    if (!existsSync(catDir)) continue;
    console.log(`\n━━━ ${cat.toUpperCase()} ━━━`);
    const slugs = readdirSync(catDir).filter((s) => {
      if (bookArg && s !== bookArg) return false;
      return existsSync(path.join(catDir, s, `${s}.json`));
    });
    for (const slug of slugs.sort()) {
      const f = path.join(catDir, slug, `${slug}.json`);
      try {
        const r = await topupBook(f);
        const delta = r.after - r.before;
        grandBefore += r.before;
        grandAfter += r.after;
        grandRefetched += r.refetched;
        if (delta > 0) {
          console.log(
            `  ✅ ${slug.padEnd(36)} +${delta} en segs (${r.before}→${r.after}, refetched ${r.refetched})`
          );
        } else if (r.refetched > 0) {
          console.log(
            `  ·  ${slug.padEnd(36)} no improvement (${r.refetched} leaves checked)`
          );
        }
      } catch (e) {
        console.error(`  ✖ ${slug}: ${(e as Error).message}`);
      }
    }
  }

  console.log(
    `\n=== TOTAL ===\n` +
      `  EN segments: ${grandBefore} → ${grandAfter} (+${grandAfter - grandBefore})\n` +
      `  Leaves refetched: ${grandRefetched}`
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
