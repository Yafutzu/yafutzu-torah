/**
 * Translate the next 7 days of daily-learning content (Chitas + Rambam) into
 * Italian using Claude.
 *
 * For each day, fetches Hebrew text from Sefaria for:
 *   - Chumash daily aliyah (parsha + day-of-week 1–7)
 *   - Tehillim daily (chapters for that Hebrew day-of-month)
 *   - Rambam 3-chapter cycle (3 perakim)
 *   - Rambam 1-chapter cycle (1 perek)
 *
 * Each chunk is translated via Claude Sonnet 4.6 with prompt caching on the
 * system message. Resumable — already-translated days are skipped.
 *
 * Output: data/raw/translations/it/<YYYY-MM-DD>.json
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/translate-week-it.mts
 *   DAYS=14 npx tsx scripts/translate-week-it.mts        (custom range)
 *   START=2026-05-10 npx tsx scripts/translate-week-it.mts
 */

import Anthropic from "@anthropic-ai/sdk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { HDate, Sedra } from "@hebcal/core";
import { dailyRambam1, dailyRambam3 } from "@hebcal/learning";

// ── Load .env.local ──────────────────────────────────────────────────────
try {
  const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1].trim()])
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not set. Add to .env.local and re-run.");
  process.exit(1);
}

const DAYS = Number(process.env.DAYS ?? 7);
const START = process.env.START
  ? new Date(process.env.START)
  : new Date();
const MODEL = "claude-sonnet-4-6";
const SEFARIA = "https://www.sefaria.org";
const OUT_DIR = path.join(process.cwd(), "data", "raw", "translations", "it");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const anthropic = new Anthropic({ apiKey: API_KEY });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Fetch helpers ────────────────────────────────────────────────────────

async function fetchSefaria(ref: string): Promise<string[] | null> {
  const url = `${SEFARIA}/api/v3/texts/${encodeURIComponent(
    ref.replace(/ /g, "_")
  )}?version=hebrew`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Yafutzu-Torah/1.0 (+https://yafutzu.org)" },
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    if (j.error) return null;
    const heVer = (j.versions ?? []).find((v: any) => v.language === "he");
    if (!heVer) return null;
    const flat: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === "string") flat.push(x);
      else if (Array.isArray(x)) for (const c of x) walk(c);
    };
    walk(heVer.text);
    return flat.filter((s) => s.trim());
  } catch {
    return null;
  }
}

// ── Resolve daily content for a date ────────────────────────────────────

interface DailyContent {
  gregorian: string;
  hebrew: { day: number; month: string; year: number };
  parsha: string | null;
  aliyah: number; // 1-7
  tehillimDay: number;
  rambam3: Array<{ name: string; perek: number; ref: string }>;
  rambam1: { name: string; perek: number; ref: string } | null;
}

function resolveDay(d: Date): DailyContent {
  const hd = new HDate(d);
  const dow = hd.getDay(); // 0=Sun, 6=Sat
  const aliyah = dow === 6 ? 7 : dow + 1;

  // Find upcoming Shabbos parsha
  const daysUntilShabbos = dow === 6 ? 0 : 6 - dow;
  const shabbos = new HDate(hd.abs() + daysUntilShabbos);
  const sedra = new Sedra(shabbos.getFullYear(), false);
  const sLookup = sedra.lookup(shabbos);
  const parsha = sLookup.chag
    ? null
    : (sLookup.parsha as string[]).join("-");

  const r3 = dailyRambam3(hd) || [];
  const r1raw = dailyRambam1(hd);

  return {
    gregorian: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`,
    hebrew: { day: hd.getDate(), month: hd.getMonthName(), year: hd.getFullYear() },
    parsha,
    aliyah,
    tehillimDay: hd.getDate(),
    rambam3: r3.map((x) => ({
      name: x.name,
      perek: x.perek,
      ref: `Mishneh Torah, ${x.name} ${x.perek}`,
    })),
    rambam1: r1raw
      ? {
          name: r1raw.name,
          perek: r1raw.perek,
          ref: `Mishneh Torah, ${r1raw.name} ${r1raw.perek}`,
        }
      : null,
  };
}

// ── Translation ──────────────────────────────────────────────────────────

const SYSTEM = `Sei un traduttore esperto di testi sacri ebraici verso l'italiano. Traduci il testo ebraico fornito in un italiano chiaro, fluido e fedele al senso originale. Mantieni i termini halachici e nomi propri ebraici in traslitterazione (es. mitzvà, Talmud, Shabbat). Restituisci SOLO la traduzione, senza commenti, premesse o note. Se il testo è suddiviso in più segmenti numerati, mantieni la stessa numerazione.`;

async function translateChunks(label: string, chunks: string[]): Promise<string[]> {
  if (!chunks.length) return [];
  // Build a numbered prompt
  const numbered = chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  const prompt = `Traduci in italiano i seguenti segmenti del testo "${label}". Restituisci ogni traduzione preceduta dal suo numero in parentesi quadre, ad esempio: [1] traduzione...\n\n${numbered}`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n") || "";

  // Parse [n] segments back to array (preserve order, fill missing with "")
  const out: string[] = new Array(chunks.length).fill("");
  const re = /\[(\d+)\]\s*([\s\S]*?)(?=\n\s*\[\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < out.length) out[idx] = m[2].trim();
  }
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function translateDay(d: Date) {
  const day = resolveDay(d);
  const outFile = path.join(OUT_DIR, `${day.gregorian}.json`);
  if (existsSync(outFile)) {
    console.log(`✓ ${day.gregorian}: already done`);
    return;
  }

  console.log(`\n=== ${day.gregorian} (${day.hebrew.day} ${day.hebrew.month} ${day.hebrew.year}) ===`);
  console.log(`  parsha: ${day.parsha} aliyah ${day.aliyah}`);
  console.log(`  rambam3: ${day.rambam3.map((x) => x.ref).join(" / ")}`);
  console.log(`  rambam1: ${day.rambam1?.ref ?? "—"}`);
  console.log(`  tehillim: day ${day.tehillimDay}`);

  const result: any = {
    gregorian: day.gregorian,
    hebrew: day.hebrew,
    parsha: day.parsha,
    aliyah: day.aliyah,
    tehillimDay: day.tehillimDay,
    sources: {},
  };

  // Tehillim daily — fetch and translate
  const tehRef = `Tehillim ${day.tehillimDay}`; // not actually a Sefaria ref; use Psalms by day-mapping
  // Use Chabad tehillim daily mapping (handled via existing tehillim-monthly.json if present)
  try {
    const monthlyData = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "schedules", "tehillim-monthly.json"), "utf8")
    );
    const todays = monthlyData.find((x: any) => x.day === day.tehillimDay);
    if (todays) {
      const psalmRanges = todays.chapters as number[];
      const tehSegs: string[] = [];
      const tehRefs: string[] = [];
      for (const ch of psalmRanges) {
        const segs = await fetchSefaria(`Psalms ${ch}`);
        if (segs) {
          tehSegs.push(...segs.map((s, i) => `${ch}:${i + 1} ${s}`));
          tehRefs.push(`Psalms ${ch}`);
        }
      }
      console.log(`  …translating Tehillim (${tehSegs.length} verses)`);
      const itTeh = await translateChunks(`Tehillim`, tehSegs);
      result.sources.tehillim = {
        refs: tehRefs,
        chapters: psalmRanges,
        segments: tehSegs.map((he, i) => ({ he, it: itTeh[i] || "" })),
      };
    }
  } catch (e) {
    console.warn("  Tehillim skip:", (e as Error).message);
  }

  // Chumash aliyah for the parsha
  if (day.parsha) {
    // Use Sefaria's aliyot endpoint
    const aliyotRef = `${day.parsha}, Aliyah ${day.aliyah}`;
    let segs = await fetchSefaria(aliyotRef);
    if (!segs || !segs.length) {
      // Fallback: full parsha (truncate if huge)
      segs = await fetchSefaria(day.parsha);
    }
    if (segs && segs.length) {
      // cap to 60 verses to keep token usage reasonable
      const cap = 60;
      const used = segs.slice(0, cap);
      console.log(`  …translating Chumash ${aliyotRef} (${used.length}/${segs.length} verses)`);
      const itCh = await translateChunks(aliyotRef, used);
      result.sources.chumash = {
        ref: aliyotRef,
        parsha: day.parsha,
        aliyah: day.aliyah,
        truncated: segs.length > cap,
        segments: used.map((he, i) => ({ he, it: itCh[i] || "" })),
      };
    }
  }

  // Rambam 3-chapter cycle — for each of the 3 perakim
  result.sources.rambam3 = [];
  for (const r of day.rambam3) {
    const segs = await fetchSefaria(r.ref);
    if (!segs || !segs.length) continue;
    console.log(`  …translating Rambam-3: ${r.ref} (${segs.length} halachot)`);
    const it = await translateChunks(r.ref, segs);
    result.sources.rambam3.push({
      ref: r.ref,
      name: r.name,
      perek: r.perek,
      segments: segs.map((he, i) => ({ he, it: it[i] || "" })),
    });
    await sleep(200);
  }

  // Rambam 1-chapter cycle
  if (day.rambam1) {
    const segs = await fetchSefaria(day.rambam1.ref);
    if (segs && segs.length) {
      console.log(`  …translating Rambam-1: ${day.rambam1.ref} (${segs.length} halachot)`);
      const it = await translateChunks(day.rambam1.ref, segs);
      result.sources.rambam1 = {
        ref: day.rambam1.ref,
        name: day.rambam1.name,
        perek: day.rambam1.perek,
        segments: segs.map((he, i) => ({ he, it: it[i] || "" })),
      };
    }
  }

  result.translatedAt = new Date().toISOString();
  result.model = MODEL;
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  const totalSegs =
    (result.sources.tehillim?.segments?.length ?? 0) +
    (result.sources.chumash?.segments?.length ?? 0) +
    (result.sources.rambam3?.reduce((a: number, r: any) => a + r.segments.length, 0) ?? 0) +
    (result.sources.rambam1?.segments?.length ?? 0);
  console.log(`  ✅ saved ${path.relative(process.cwd(), outFile)} (${totalSegs} segs)`);
}

async function main() {
  const start = new Date(START);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    try {
      await translateDay(d);
    } catch (e) {
      console.error(`✖ ${d.toDateString()}: ${(e as Error).message}`);
    }
  }
  console.log(`\n✨ Done. Translated ${DAYS} days into ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
