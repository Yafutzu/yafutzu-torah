/**
 * Seed script: load Italian translations for Hilchot Yibum v'Chalitzah into MongoDB.
 * Upserts Book, Chapter, and Verse documents.
 *
 * Usage: npx tsx scripts/seed-rambam-it.ts
 */

import { readFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import { Book } from "../src/models/book.model";
import { Chapter } from "../src/models/chapter.model";
import { Verse } from "../src/models/verse.model";

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envFile = readFileSync(
    path.join(process.cwd(), ".env.local"),
    "utf8"
  );
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // .env.local not found — rely on existing environment variables
}

// ── Types for the raw JSON format ───────────────────────────────────────────
interface RawHalacha {
  chapter: number;
  halacha: number;
  he: string;
  it: string;
  translatedAt?: string;
  flag?: string;
}

interface RawChapter {
  chapter: number;
  totalHalachot: number;
  halachot: RawHalacha[];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set. Add it to .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");

  // ── Book ──────────────────────────────────────────────────────────────────
  const book = await Book.findOneAndUpdate(
    { slug: "yibum-vchalitzah" },
    {
      $set: {
        slug: "yibum-vchalitzah",
        title: {
          he: "הלכות יבום וחליצה",
          en: "Laws of Levirate Marriage and Release",
        },
        category: "rambam",
        order: 50,
        "metadata.totalChapters": 8,
        "metadata.author": "Rambam",
        "metadata.languages": ["he", "it"],
        "metadata.description": {
          he: "הלכות יבום וחליצה — ספר נשים",
          en: "Hilchot Yibum v'Chalitzah — Sefer Nashim",
        },
      },
    },
    { upsert: true, new: true }
  );
  console.log(`📗  Book: ${book.title.en} (${book._id})`);

  // ── Chapters & Verses ─────────────────────────────────────────────────────
  let totalVerses = 0;

  for (let num = 1; num <= 8; num++) {
    const filePath = path.join(
      process.cwd(),
      "data/raw/rambam/yibum-chalitzah",
      `chapter-${num}.json`
    );

    let raw: RawChapter;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf8")) as RawChapter;
    } catch (e) {
      console.error(`  ⚠️  Could not read chapter-${num}.json: ${e}`);
      continue;
    }

    // Upsert Chapter
    const chapter = await Chapter.findOneAndUpdate(
      { bookId: book._id, number: num },
      {
        $set: {
          bookId: book._id,
          number: num,
          "metadata.verseCount": raw.totalHalachot,
        },
      },
      { upsert: true, new: true }
    );

    // Upsert Verses
    let count = 0;
    for (const h of raw.halachot) {
      await Verse.findOneAndUpdate(
        { chapterId: chapter._id, number: h.halacha },
        {
          $set: {
            bookId: book._id,
            chapterId: chapter._id,
            number: h.halacha,
            "text.he": h.he,
            "text.it": h.it,
          },
        },
        { upsert: true }
      );
      count++;
    }

    console.log(`  📖  Chapter ${num}: ${count}/${raw.totalHalachot} halachot`);
    totalVerses += count;
  }

  console.log(`\n✨  Done — ${totalVerses} halachot seeded`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
