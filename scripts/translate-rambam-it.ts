/**
 * translate-rambam-it.ts
 *
 * Fetches Hilchot Yibum v'Chalitzah from Sefaria (Hebrew) and translates
 * each halacha into Italian using Claude, saving progress as JSON so the
 * script can be re-run and resume where it left off.
 *
 * Usage:
 *   npx tsx scripts/translate-rambam-it.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/translate-rambam-it.ts
 *
 * Output:
 *   data/raw/rambam/yibum-chalitzah/chapter-{N}.json  (one file per chapter)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// ─── Config ────────────────────────────────────────────────────────────────

const TOTAL_CHAPTERS = 8;
const SEFARIA_BASE =
  "https://www.sefaria.org/api/texts/Mishneh_Torah,_Laws_of_Levirate_Marriage_and_Release";
const OUT_DIR = path.join(
  __dirname,
  "../data/raw/rambam/yibum-chalitzah"
);

// Delay between API calls to avoid rate-limiting
const DELAY_MS = 800;

// ─── Types ─────────────────────────────────────────────────────────────────

interface HalachaEntry {
  chapter: number;
  halacha: number;
  he: string;
  it: string;
  translatedAt: string;
}

interface ChapterFile {
  chapter: number;
  totalHalachot: number;
  halachot: HalachaEntry[];
  completedAt?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip HTML tags and footnote markers Sefaria includes */
function cleanHtml(raw: string): string {
  return raw
    // Remove <sup>…</sup> footnote markers (multi-line safe without `s` flag)
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, "")
    .replace(/<i class="footnote">[\s\S]*?<\/i>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function outPath(chapter: number) {
  return path.join(OUT_DIR, `chapter-${chapter}.json`);
}

function loadExisting(chapter: number): ChapterFile | null {
  const p = outPath(chapter);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ChapterFile;
  } catch {
    return null;
  }
}

function save(data: ChapterFile) {
  fs.writeFileSync(outPath(data.chapter), JSON.stringify(data, null, 2), "utf8");
}

// ─── Sefaria fetch ─────────────────────────────────────────────────────────

async function fetchChapterHebrew(
  chapter: number
): Promise<{ he: string[]; en: string[] }> {
  const url = `${SEFARIA_BASE}.${chapter}?lang=he&context=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sefaria ${chapter} → HTTP ${res.status}`);
  const data = (await res.json()) as { he: string[]; text?: string[] };
  return {
    he: (data.he || []).map(cleanHtml),
    en: (data.text || []).map(cleanHtml),
  };
}

// ─── Claude translation ────────────────────────────────────────────────────

async function translateBatch(
  ai: Anthropic,
  chapter: number,
  entries: { halacha: number; he: string }[],
  systemPrompt: string
): Promise<Map<number, string>> {
  const numbered = entries
    .map(
      (e) => `[${e.halacha}] ${e.he}`
    )
    .join("\n\n");

  const msg = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Traduci in italiano le seguenti halachot del Rambam (Hilchot Yibum ve-Chalitzah, capitolo ${chapter}).
Mantieni i termini tecnici halachici in ebraico traslitterato la prima volta che appaiono, seguito dalla traduzione italiana tra parentesi.
Restituisci SOLO le traduzioni nel formato:
[N] testo tradotto

Testo originale:
${numbered}`,
      },
    ],
  });

  const block = msg.content[0];
  if (block.type !== "text") return new Map();

  const result = new Map<number, string>();
  const matches = Array.from(
    block.text.matchAll(/\[(\d+)\]\s+([\s\S]*?)(?=\n\[(\d+)\]|$)/g)
  );
  for (const m of matches) {
    result.set(parseInt(m[1]), m[2].trim());
  }
  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌  Set ANTHROPIC_API_KEY before running this script.");
    process.exit(1);
  }

  const ai = new Anthropic({ apiKey });

  // Cached system prompt — sent once and reused across all batches
  const systemPrompt = `Sei un esperto traduttore di testi halachici ebraici con profonda conoscenza della letteratura rabbinica classica.
Il tuo compito è tradurre la Mishneh Torah del Rambam in italiano accademico e preciso.

Regole:
- Usa un italiano colto e formale, adatto a un testo religioso-giuridico del XII secolo.
- Mantieni i termini tecnici halachici in ebraico traslitterato (es. yibum, chalitzah, yevamah, yavam, agunah) la prima volta che compaiono nel capitolo, con spiegazione tra parentesi.
- Non aggiungere spiegazioni o commenti non presenti nell'originale.
- Traduci fedelmente, preservando la struttura logica del ragionamento halachico.
- Non usare termini italiani cristiani per concetti ebraici (es. non "matrimonio religioso" ma "kiddushin").`;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    console.log(`\n📖 Capitolo ${ch}/${TOTAL_CHAPTERS}`);

    // Load existing progress
    const existing = loadExisting(ch);
    const doneSet = new Set(
      (existing?.halachot || []).map((h) => h.halacha)
    );

    if (existing?.completedAt) {
      console.log(`   ✅ Già completato (${existing.halachot.length} halachot) — skip`);
      totalSkipped += existing.halachot.length;
      continue;
    }

    // Fetch Hebrew
    console.log(`   ⬇️  Sefaria fetch...`);
    const { he } = await fetchChapterHebrew(ch);
    console.log(`   📜 ${he.length} halachot`);
    await sleep(300);

    // Build chapter file (merge with existing if partial)
    const chapterData: ChapterFile = {
      chapter: ch,
      totalHalachot: he.length,
      halachot: existing?.halachot ? [...existing.halachot] : [],
    };

    // Collect halachot needing translation
    const todo = he
      .map((text, i) => ({ halacha: i + 1, he: text }))
      .filter((e) => !doneSet.has(e.halacha) && e.he.trim().length > 0);

    if (todo.length === 0) {
      console.log(`   ✅ Nessuna halacha da tradurre`);
      chapterData.completedAt = new Date().toISOString();
      save(chapterData);
      continue;
    }

    console.log(`   🔄 Da tradurre: ${todo.length} halachot (già fatte: ${doneSet.size})`);

    // Translate in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      const batch = todo.slice(i, i + BATCH_SIZE);
      const batchNums = batch.map((b) => b.halacha).join(", ");
      process.stdout.write(
        `   🤖 Traduzione halachot ${batchNums}... `
      );

      try {
        const translations = await translateBatch(ai, ch, batch, systemPrompt);

        for (const entry of batch) {
          const it = translations.get(entry.halacha);
          if (!it) {
            console.warn(`\n   ⚠️  Traduzione mancante per halacha ${entry.halacha}`);
            continue;
          }
          chapterData.halachot.push({
            chapter: ch,
            halacha: entry.halacha,
            he: entry.he,
            it,
            translatedAt: new Date().toISOString(),
          });
          totalTranslated++;
        }

        // Sort and save after each batch (progress checkpoint)
        chapterData.halachot.sort((a, b) => a.halacha - b.halacha);
        save(chapterData);
        console.log("✅");

        if (i + BATCH_SIZE < todo.length) await sleep(DELAY_MS);
      } catch (err) {
        console.error(`\n   ❌ Errore nel batch: ${err}`);
        save(chapterData); // save what we have
        process.exit(1);
      }
    }

    // Mark chapter complete if all halachot are done
    if (chapterData.halachot.length === he.length) {
      chapterData.completedAt = new Date().toISOString();
      save(chapterData);
      console.log(
        `   🎉 Capitolo ${ch} completato (${chapterData.halachot.length}/${he.length} halachot)`
      );
    } else {
      console.log(
        `   ⚠️  Capitolo ${ch} parziale (${chapterData.halachot.length}/${he.length})`
      );
    }

    // Pause between chapters
    if (ch < TOTAL_CHAPTERS) await sleep(DELAY_MS * 2);
  }

  console.log(`\n✅ Traduzione completata!`);
  console.log(`   Tradotte: ${totalTranslated} halachot`);
  console.log(`   Saltate (già fatte): ${totalSkipped} halachot`);
  console.log(`   Output: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
