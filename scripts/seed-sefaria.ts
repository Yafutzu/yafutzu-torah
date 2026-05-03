/**
 * Seed scraped Sefaria texts into MongoDB.
 *
 * Reads data/raw/<category>/<slug>/<slug>.json (produced by scrape-sefaria.ts),
 * upserts Book/Chapter/Verse documents.
 *
 * Each leaf in the scraped file becomes a Chapter; each segment within the
 * leaf becomes a Verse, numbered sequentially.
 *
 * Usage:
 *   npx tsx scripts/seed-sefaria.ts                         (all categories)
 *   npx tsx scripts/seed-sefaria.ts chasidut                (one category)
 *   npx tsx scripts/seed-sefaria.ts chasidut tanya          (one book)
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import { Book } from "../src/models/book.model";
import { Chapter } from "../src/models/chapter.model";
import { Verse } from "../src/models/verse.model";

// Load .env.local
try {
  const envFile = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch {}

const STRIP_TAGS = /<[^>]+>/g;
const stripPlain = (s: string) =>
  s.replace(STRIP_TAGS, "").replace(/\s+/g, " ").trim();

interface Leaf {
  ref: string;
  heRef?: string;
  he?: unknown;
  en?: unknown;
}

interface BookFile {
  title: string;
  heTitle?: string;
  categories?: string[];
  slug: string;
  source?: string;
  license?: { he?: string; en?: string };
  versionTitles?: { he?: string; en?: string };
  leafCount?: number;
  segmentCount?: number;
  leaves: Leaf[];
}

/** Flatten any nested string array into a flat list of strings. */
function flatten(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") {
    out.push(x);
  } else if (Array.isArray(x)) {
    for (const c of x) flatten(c, out);
  }
  return out;
}

const VALID_CATEGORIES = new Set([
  "chumash",
  "tehillim",
  "tanya",
  "rambam",
  "tanakh",
  "chasidut",
  "mussar",
  "kabbalah",
  "liturgy",
  "jewish-thought",
  "halacha",
  "midrash",
  "mishnah",
  "commentary",
]);

async function seedBookFile(filePath: string, category: string, order: number) {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as BookFile;
  const leaves = raw.leaves || [];
  if (!leaves.length) {
    console.log(`  ⚠  ${raw.slug}: no leaves, skipping`);
    return;
  }

  const book = await Book.findOneAndUpdate(
    { slug: raw.slug },
    {
      $set: {
        slug: raw.slug,
        title: {
          he: raw.heTitle || raw.title,
          en: raw.title,
        },
        category,
        order,
        "metadata.totalChapters": leaves.length,
        "metadata.author": raw.categories?.join(" / "),
        "metadata.languages": ["he", "en"],
        "metadata.description": {
          en: `Sefaria source: ${raw.versionTitles?.en || "n/a"}; license: ${raw.license?.en || "?"}`,
          he: raw.versionTitles?.he || "",
        },
      },
    },
    { upsert: true, new: true }
  );

  let totalVerses = 0;
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    const heSegs = flatten(leaf.he);
    const enSegs = flatten(leaf.en);
    if (!heSegs.length && !enSegs.length) continue;

    const chapter = await Chapter.findOneAndUpdate(
      { bookId: book._id, number: i + 1 },
      {
        $set: {
          bookId: book._id,
          number: i + 1,
          title: { he: leaf.heRef || "", en: leaf.ref || "" },
          "metadata.verseCount": Math.max(heSegs.length, enSegs.length),
          "metadata.ref": leaf.ref,
          "metadata.heRef": leaf.heRef,
        },
      },
      { upsert: true, new: true }
    );

    const ops: any[] = [];
    const max = Math.max(heSegs.length, enSegs.length);
    for (let j = 0; j < max; j++) {
      const he = heSegs[j] || "";
      const en = enSegs[j] || "";
      if (!he && !en) continue;
      ops.push({
        updateOne: {
          filter: { chapterId: chapter._id, number: j + 1 },
          update: {
            $set: {
              bookId: book._id,
              chapterId: chapter._id,
              number: j + 1,
              "text.he": he,
              "text.he_plain": stripPlain(he),
              "text.en": en,
            },
          },
          upsert: true,
        },
      });
    }
    if (ops.length) {
      await Verse.bulkWrite(ops, { ordered: false });
      totalVerses += ops.length;
    }
  }

  console.log(
    `  ✅ ${raw.slug.padEnd(34)} ${leaves.length.toString().padStart(4)} chapters, ${totalVerses
      .toString()
      .padStart(6)} verses`
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set. Add it to .env.local");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");

  const [, , catArg, bookArg] = process.argv;

  const dataRoot = path.join(process.cwd(), "data", "raw");
  const categories = catArg
    ? [catArg]
    : readdirSync(dataRoot).filter((c) =>
        VALID_CATEGORIES.has(c) && existsSync(path.join(dataRoot, c))
      );

  for (const cat of categories) {
    if (!VALID_CATEGORIES.has(cat)) {
      console.warn(`  ⚠  unknown category ${cat}, skipping`);
      continue;
    }
    const catDir = path.join(dataRoot, cat);
    if (!existsSync(catDir)) continue;
    console.log(`\n━━━ ${cat.toUpperCase()} ━━━`);
    const slugs = readdirSync(catDir).filter((s) => {
      if (bookArg && s !== bookArg) return false;
      const f = path.join(catDir, s, `${s}.json`);
      return existsSync(f);
    });
    let order = 1;
    for (const slug of slugs.sort()) {
      const f = path.join(catDir, slug, `${slug}.json`);
      try {
        await seedBookFile(f, cat, order++);
      } catch (e) {
        console.error(`  ✖ ${slug}: ${(e as Error).message}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log("\n✨  Done");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
