/**
 * Run scrape-sefaria.ts across a curated list of Chasidut books, sequentially.
 * Idempotent: each book resumes from existing data file.
 *
 * Usage:
 *   npx tsx scripts/scrape-chasidut-batch.ts
 *   ONLY="Tanya,Likutei Moharan" npx tsx scripts/scrape-chasidut-batch.ts
 */

import { spawn } from "child_process";
import path from "path";

const BOOKS = [
  // Chabad
  "Tanya",
  "Likkutei Torah",
  "Torah Ohr",
  "Derekh Mitzvotekha",
  "The Gate of Unity",
  "Kuntres HaHitpa'alut",
  // Breslov
  "Likutei Moharan",
  "Sefer HaMiddot",
  "Sichot HaRan",
  "Sippurei Maasiyot",
  "Likutei Tefilot",
  "Likkutei Etzot",
  "Chayei Moharan",
  "Shivchei HaRan",
  // Early / Baal Shem Tov circle
  "Tzava'at HaRivash",
  "Keter Shem Tov",
  "Ben Porat Yosef",
  "Toldot Yaakov Yosef",
  "Me'or Einayim",
  "Maggid Devarav leYaakov",
  "Noam Elimelekh",
  "Kedushat Levi",
  "Peri HaAretz",
  "Ketonet Pasim",
  "Tzofnat Paneach",
  // Izhbitz / Polish
  "Mei HaShiloach",
  "Beit Yaakov on Torah",
  "Sod Yesharim",
  // R' Tzadok
  "Tzidkat HaTzadik",
  "Resisei Layla",
  "Peri Tzadik",
  "Likkutei Maamarim",
  "Machshavot Charutz",
  "Takanat HaShavin",
  "Yisrael Kedoshim",
  "Dover Tzedek",
  "Divrei Soferim",
  // Piaseczno
  "Esh Kodesh",
  "Bnei Machshava Tova",
  "Chovat HaTalmidim",
  "Hakhsharat HaAvrekhim",
  "Derekh HaMelekh",
  // Other major works
  "Bnei Yissaschar",
  "Ohev Yisrael",
  "Sefat Emet",
  "Maor VaShemesh",
  "Degel Machaneh Ephraim",
  "Bat Ayin",
  "Tiferet Shlomo",
  "Be'er Mayim Chaim",
  "Avodat Yisrael",
  "Shem MiShmuel",
  "Chiddushei HaRim on Torah",
  "Yismach Moshe",
  "Imrei Shefer",
  "Agra DeKala",
  "Sidduro Shel Shabbat",
  "Arvei Nachal",
  "Ohr HaMeir",
  "Zera Kodesh",
  "Mareh Yechezkel on Torah",
  "Shivchei HaBesht",
  "Midrash Pinchas",
  "Sha'arei HaYichud VeEmunah",
];

function run(book: string): Promise<{ book: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", path.join("scripts", "scrape-sefaria.ts"), book, "chasidut"],
      { stdio: "inherit", env: { ...process.env, SCRAPE_THROTTLE_MS: "300" } }
    );
    child.on("close", (code) => resolve({ book, code: code ?? 1 }));
  });
}

async function main() {
  const only = process.env.ONLY?.split(",").map((s) => s.trim());
  const books = only ? BOOKS.filter((b) => only.includes(b)) : BOOKS;

  console.log(`📚  Scraping ${books.length} Chasidut books from Sefaria\n`);

  const results: { book: string; code: number }[] = [];
  let idx = 0;
  for (const b of books) {
    idx++;
    console.log(`\n[${idx}/${books.length}] ▶ ${b}`);
    const r = await run(b);
    results.push(r);
  }

  console.log(`\n\n=== SUMMARY ===`);
  const ok = results.filter((r) => r.code === 0);
  const bad = results.filter((r) => r.code !== 0);
  console.log(`✅ ${ok.length} succeeded`);
  if (bad.length) {
    console.log(`❌ ${bad.length} failed:`);
    for (const r of bad) console.log(`   - ${r.book} (exit ${r.code})`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
