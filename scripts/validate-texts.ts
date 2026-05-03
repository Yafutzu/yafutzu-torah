/**
 * Validates text contribution files in data/raw/
 * Run: npx tsx scripts/validate-texts.ts
 * Or: npm run validate
 */

import fs from "fs";
import path from "path";

const VALID_CATEGORIES = ["chumash", "tehillim", "tanya", "rambam"];
const DATA_DIR = path.join(process.cwd(), "data", "raw");

interface TextFile {
  book: string;
  category: string;
  chapter: number;
  title?: { he: string; en?: string };
  verses: {
    number: number;
    he: string;
    en?: string;
  }[];
}

let errors = 0;
let warnings = 0;
let filesChecked = 0;

function logError(file: string, msg: string) {
  console.error(`  ERROR: ${file} — ${msg}`);
  errors++;
}

function logWarning(file: string, msg: string) {
  console.warn(`  WARN:  ${file} — ${msg}`);
  warnings++;
}

function validateFile(filePath: string, category: string) {
  const fileName = path.basename(filePath);
  filesChecked++;

  let data: TextFile;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  } catch (e) {
    logError(fileName, `Invalid JSON: ${(e as Error).message}`);
    return;
  }

  // Required fields
  if (!data.book || typeof data.book !== "string") {
    logError(fileName, 'Missing or invalid "book" field (string required)');
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    logError(
      fileName,
      `Missing or invalid "category" field. Must be one of: ${VALID_CATEGORIES.join(", ")}`
    );
  }

  if (data.category && data.category !== category) {
    logError(
      fileName,
      `File is in "${category}/" but category field says "${data.category}"`
    );
  }

  if (typeof data.chapter !== "number" || data.chapter < 1) {
    logError(fileName, '"chapter" must be a positive number');
  }

  // Verses
  if (!Array.isArray(data.verses) || data.verses.length === 0) {
    logError(fileName, '"verses" must be a non-empty array');
    return;
  }

  const verseNumbers = new Set<number>();
  for (let i = 0; i < data.verses.length; i++) {
    const v = data.verses[i];

    if (typeof v.number !== "number" || v.number < 1) {
      logError(fileName, `Verse ${i}: "number" must be a positive number`);
    }

    if (verseNumbers.has(v.number)) {
      logError(fileName, `Verse ${v.number}: duplicate verse number`);
    }
    verseNumbers.add(v.number);

    if (!v.he || typeof v.he !== "string") {
      logError(fileName, `Verse ${v.number}: missing Hebrew text ("he" field)`);
    }

    if (v.he && v.he.length < 2) {
      logWarning(
        fileName,
        `Verse ${v.number}: Hebrew text is suspiciously short`
      );
    }

    if (!v.en) {
      logWarning(fileName, `Verse ${v.number}: no English translation`);
    }
  }

  // Check verse numbering is sequential
  const sorted = [...verseNumbers].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      logWarning(
        fileName,
        `Gap in verse numbering between ${sorted[i - 1]} and ${sorted[i]}`
      );
    }
  }

  // Check file naming convention
  const expectedName = `${data.book}-${data.chapter}.json`;
  if (fileName !== expectedName) {
    logWarning(
      fileName,
      `File should be named "${expectedName}" (got "${fileName}")`
    );
  }
}

function scanCategory(category: string) {
  const dir = path.join(DATA_DIR, category);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return;

  console.log(`\n${category.toUpperCase()} (${files.length} files)`);

  for (const file of files) {
    validateFile(path.join(dir, file), category);
  }
}

// Main
console.log("Validating text files in data/raw/...\n");

for (const category of VALID_CATEGORIES) {
  scanCategory(category);
}

console.log(`\n${"—".repeat(40)}`);
console.log(`Files checked: ${filesChecked}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (filesChecked === 0) {
  console.log(
    "\nNo text files found yet. Add JSON files to data/raw/{category}/ to get started!"
  );
  console.log("See CONTRIBUTING.md for the file format.");
}

if (errors > 0) {
  console.error("\nValidation FAILED. Fix errors above before submitting.");
  process.exit(1);
} else if (warnings > 0) {
  console.log("\nValidation passed with warnings.");
} else if (filesChecked > 0) {
  console.log("\nAll files valid!");
}
