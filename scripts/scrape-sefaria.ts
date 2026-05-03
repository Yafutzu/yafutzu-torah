/**
 * Sefaria scraper — walks a book's schema and fetches each leaf node whole.
 *
 * For complex books (most Chasidut), the schema is a tree where each leaf is
 * a JaggedArrayNode (e.g. one parsha or one chapter group). Fetching a leaf
 * by its full title returns all sections at once as a nested array.
 *
 * Output: data/raw/<category>/<slug>/<slug>.json
 *
 * Usage:
 *   npx tsx scripts/scrape-sefaria.ts "Likkutei Torah" chasidut
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const SEFARIA = "https://www.sefaria.org";
const THROTTLE_MS = Number(process.env.SCRAPE_THROTTLE_MS ?? 350);

interface LeafOut {
  ref: string;
  heRef?: string;
  he?: unknown;
  en?: unknown;
}

interface BookOut {
  title: string;
  heTitle?: string;
  categories?: string[];
  slug: string;
  source: "sefaria";
  license: { he?: string; en?: string };
  versionTitles: { he?: string; en?: string };
  scrapedAt: string;
  leafCount: number;
  segmentCount: number;
  leaves: LeafOut[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * Recursively walk schema. Yields one ref per leaf JaggedArrayNode (or
 * default node with depth/addressTypes). The ref is constructed from the
 * book title plus all ancestor titles.
 */
function collectLeafRefs(schema: any, bookTitle: string): string[] {
  const out: string[] = [];
  const walk = (node: any, ancestors: string[], isRoot: boolean) => {
    if (!node) return;
    const ownTitle: string | null =
      node.title || node.sharedTitle || node.key || null;
    const isDefault = node.default === true || ownTitle === "default";

    if (Array.isArray(node.nodes) && node.nodes.length) {
      // intermediate parent — skip its own title at root, otherwise append
      const next =
        isRoot || !ownTitle ? ancestors : [...ancestors, ownTitle];
      for (const c of node.nodes) walk(c, next, false);
      return;
    }

    // leaf
    let ref: string;
    if (isDefault || !ownTitle) {
      // ref is just the ancestor path
      ref = [bookTitle, ...ancestors].join(", ");
    } else if (isRoot) {
      // simple book, no ancestors, no own title beyond book
      ref = bookTitle;
    } else {
      ref = [bookTitle, ...ancestors, ownTitle].join(", ");
    }
    if (ref && !out.includes(ref)) out.push(ref);
  };
  walk(schema, [], true);
  return out;
}

async function scrapeBook(
  title: string,
  category: string
): Promise<{ outFile: string; leaves: number; segments: number }> {
  const slug = slugify(title);
  const outDir = path.join(process.cwd(), "data", "raw", category, slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${slug}.json`);

  let book: BookOut;
  const seen = new Set<string>();
  if (existsSync(outFile)) {
    try {
      book = JSON.parse(readFileSync(outFile, "utf8")) as BookOut;
      book.leaves = book.leaves || [];
      for (const l of book.leaves) seen.add(l.ref);
      console.log(`  ↩  resume ${title}: ${book.leaves.length} leaves done`);
    } catch {
      book = null as any;
    }
  }

  const idx = await fetchJSON(
    `${SEFARIA}/api/v2/index/${encodeURIComponent(title.replace(/ /g, "_"))}`
  );

  if (!book!) {
    book = {
      title: idx.title || title,
      heTitle: idx.heTitle,
      categories: idx.categories,
      slug,
      source: "sefaria",
      license: {},
      versionTitles: {},
      scrapedAt: new Date().toISOString(),
      leafCount: 0,
      segmentCount: 0,
      leaves: [],
    };
  }

  // Build list of leaf refs to fetch
  let leafRefs: string[];
  if (idx.schema?.nodeType === "JaggedArrayNode") {
    leafRefs = [title];
  } else {
    leafRefs = collectLeafRefs(idx.schema, idx.title || title);
  }

  // Filter out already-seen
  const todo = leafRefs.filter((r) => !seen.has(r));
  if (!todo.length) {
    console.log(`✓  ${title}: already complete (${book.leaves.length} leaves)`);
    return {
      outFile,
      leaves: book.leaves.length,
      segments: book.segmentCount,
    };
  }

  let segCount = book.segmentCount;
  for (let i = 0; i < todo.length; i++) {
    const ref = todo[i];
    const url = `${SEFARIA}/api/v3/texts/${encodeURIComponent(
      ref.replace(/ /g, "_")
    )}?version=hebrew&version=english`;
    let j: any;
    try {
      j = await fetchJSON(url);
    } catch (e) {
      console.error(`  ✖  ${ref}: ${(e as Error).message}`);
      await sleep(THROTTLE_MS);
      continue;
    }
    if (j.error) {
      console.warn(`  ⚠  ${ref}: ${j.error}`);
      await sleep(THROTTLE_MS);
      continue;
    }

    const versions = j.versions || [];
    const heV = versions.find((v: any) => v.language === "he");
    const enV = versions.find((v: any) => v.language === "en");

    if (!book.license.he && heV?.license) book.license.he = heV.license;
    if (!book.license.en && enV?.license) book.license.en = enV.license;
    if (!book.versionTitles.he && heV?.versionTitle)
      book.versionTitles.he = heV.versionTitle;
    if (!book.versionTitles.en && enV?.versionTitle)
      book.versionTitles.en = enV.versionTitle;

    // Count segments (leaves in nested arrays)
    const countSegs = (x: unknown): number => {
      if (typeof x === "string") return 1;
      if (Array.isArray(x)) return x.reduce<number>((a, b) => a + countSegs(b), 0);
      return 0;
    };
    const heSegs = countSegs(heV?.text);
    segCount += heSegs;

    book.leaves.push({
      ref: j.ref,
      heRef: j.heRef,
      he: heV?.text,
      en: enV?.text,
    });

    if ((i + 1) % 5 === 0 || i === todo.length - 1) {
      book.leafCount = book.leaves.length;
      book.segmentCount = segCount;
      writeFileSync(outFile, JSON.stringify(book, null, 0));
      console.log(
        `  …  ${title}: ${book.leaves.length}/${leafRefs.length} leaves, ${segCount} segs`
      );
    }
    await sleep(THROTTLE_MS);
  }

  book.leafCount = book.leaves.length;
  book.segmentCount = segCount;
  writeFileSync(outFile, JSON.stringify(book, null, 0));
  console.log(
    `✅  ${title}: ${book.leaves.length} leaves, ${segCount} segments → ${path.relative(
      process.cwd(),
      outFile
    )}`
  );
  return { outFile, leaves: book.leaves.length, segments: segCount };
}

async function main() {
  const [, , title, category = "chasidut"] = process.argv;
  if (!title) {
    console.error(
      "Usage: npx tsx scripts/scrape-sefaria.ts <book-title> [category]"
    );
    process.exit(1);
  }
  await scrapeBook(title, category);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
