/**
 * Generate static daily-learning schedules into data/schedules/.
 *
 * Uses @hebcal/learning for the canonical Rambam cycles (the Rebbe's order,
 * starting 27 Iyar 5744 / May 29, 1984).
 *
 * Output:
 *   data/schedules/rambam-3-cycle.json   — 339 entries × 3 perakim
 *   data/schedules/rambam-1-cycle.json   — 1017 entries × 1 perek
 *
 * Each entry uses Sefaria-style refs ("Mishneh Torah, Forbidden Intercourse 9")
 * so they can be resolved at seed time against either the Sefaria API or the
 * already-scraped data/raw/rambam/ corpus.
 *
 * Usage:
 *   npx tsx scripts/generate-schedules.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { HDate } from "@hebcal/core";
import { dailyRambam1, dailyRambam3 } from "@hebcal/learning";

const OUT_DIR = path.join(process.cwd(), "data", "schedules");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface Entry {
  cycleDay: number;
  hebrewDate: { day: number; month: string; year: number };
  refs: string[];
  englishName?: string[];
}

/** Build a Sefaria ref from a hebcal-learning entry */
function toRef(name: string, perek: number): string {
  return `Mishneh Torah, ${name} ${perek}`;
}

function buildRambam3() {
  // Cycle started 27 Iyar 5744 = May 29 1984. 339 days, then repeats.
  // Generate one full cycle from a known start date.
  const start = new HDate(27, "Iyar", 5744);
  const out: Entry[] = [];
  for (let i = 0; i < 339; i++) {
    const hd = new HDate(start.abs() + i);
    const day = dailyRambam3(hd);
    out.push({
      cycleDay: i,
      hebrewDate: {
        day: hd.getDate(),
        month: hd.getMonthName(),
        year: hd.getFullYear(),
      },
      refs: day.map((d) => toRef(d.name, d.perek)),
      englishName: day.map((d) => `${d.name} ${d.perek}`),
    });
  }
  return out;
}

function buildRambam1() {
  const start = new HDate(27, "Iyar", 5744);
  const out: Entry[] = [];
  for (let i = 0; i < 1017; i++) {
    const hd = new HDate(start.abs() + i);
    const day = dailyRambam1(hd);
    if (!day) continue;
    out.push({
      cycleDay: i,
      hebrewDate: {
        day: hd.getDate(),
        month: hd.getMonthName(),
        year: hd.getFullYear(),
      },
      refs: [toRef(day.name, day.perek)],
      englishName: [`${day.name} ${day.perek}`],
    });
  }
  return out;
}

function write(name: string, data: unknown) {
  const f = path.join(OUT_DIR, `${name}.json`);
  writeFileSync(f, JSON.stringify(data, null, 2));
  console.log(`✅ ${path.relative(process.cwd(), f)}`);
}

const rambam3 = buildRambam3();
const rambam1 = buildRambam1();

write("rambam-3-cycle", {
  source: "@hebcal/learning",
  cycleStart: "27 Iyar 5744 (May 29 1984)",
  cycleLength: 339,
  perDay: 3,
  totalChapters: 1017,
  entries: rambam3,
});

write("rambam-1-cycle", {
  source: "@hebcal/learning",
  cycleStart: "27 Iyar 5744 (May 29 1984)",
  cycleLength: 1017,
  perDay: 1,
  totalChapters: 1017,
  entries: rambam1,
});

console.log(`\nGenerated ${rambam3.length} rambam-3 entries, ${rambam1.length} rambam-1 entries.`);
