/**
 * Mega-batch — scrape curated Tanakh, Mussar, Liturgy, Kabbalah, Jewish Thought,
 * and core Halacha texts from Sefaria into data/raw/<category>/...
 *
 * Sequential to be polite to Sefaria. Resumable.
 *
 * Usage:
 *   npx tsx scripts/scrape-mega-batch.ts
 *   ONLY_CAT=tanakh npx tsx scripts/scrape-mega-batch.ts
 */

import { spawn } from "child_process";
import path from "path";

const PLAN: Record<string, string[]> = {
  tanakh: [
    // Torah
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    // Neviim
    "Joshua",
    "Judges",
    "I Samuel",
    "II Samuel",
    "I Kings",
    "II Kings",
    "Isaiah",
    "Jeremiah",
    "Ezekiel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    // Ketuvim
    "Psalms",
    "Proverbs",
    "Job",
    "Song of Songs",
    "Ruth",
    "Lamentations",
    "Ecclesiastes",
    "Esther",
    "Daniel",
    "Ezra",
    "Nehemiah",
    "I Chronicles",
    "II Chronicles",
    // Onkelos translation
    "Onkelos Genesis",
    "Onkelos Exodus",
    "Onkelos Leviticus",
    "Onkelos Numbers",
    "Onkelos Deuteronomy",
  ],
  // Targums for completeness  — separate so failures don't block Tanakh proper
  commentary: [
    "Rashi on Genesis",
    "Rashi on Exodus",
    "Rashi on Leviticus",
    "Rashi on Numbers",
    "Rashi on Deuteronomy",
    "Ramban on Genesis",
    "Ramban on Exodus",
    "Ramban on Leviticus",
    "Ramban on Numbers",
    "Ramban on Deuteronomy",
    "Ibn Ezra on Genesis",
    "Ibn Ezra on Exodus",
    "Ibn Ezra on Leviticus",
    "Ibn Ezra on Numbers",
    "Ibn Ezra on Deuteronomy",
    "Sforno on Genesis",
    "Sforno on Exodus",
    "Sforno on Leviticus",
    "Sforno on Numbers",
    "Sforno on Deuteronomy",
    "Or HaChaim on Genesis",
    "Or HaChaim on Exodus",
    "Or HaChaim on Leviticus",
    "Or HaChaim on Numbers",
    "Or HaChaim on Deuteronomy",
    "Kli Yakar on Genesis",
    "Kli Yakar on Exodus",
    "Kli Yakar on Leviticus",
    "Kli Yakar on Numbers",
    "Kli Yakar on Deuteronomy",
    "Rashi on Psalms",
    "Rashi on Proverbs",
    "Metzudat David on Psalms",
    "Metzudat Tzion on Psalms",
    "Ralbag on Job",
  ],
  mussar: [
    "Mesilat Yesharim",
    "Orchot Tzadikim",
    "Duties of the Heart",
    "Sefer Chasidim",
    "Sefer HaYashar",
    "Shaarei Teshuvah",
    "Iggeret HaMussar",
    "The Path of the Just",
    "Iggeret HaRamban",
    "Tomer Devorah",
    "Reishit Chochmah",
    "Pele Yoetz",
    "Cheshbon HaNefesh",
    "Mishlei Yaakov",
    "Or Yisrael",
    "Madregat HaAdam",
    "Michtav me'Eliyahu",
  ],
  liturgy: [
    "Pesach Haggadah",
    "Pirkei Avot",
    "Tehillim",
    "Siddur Ashkenaz",
    "Siddur Sefard",
    "Siddur Edot HaMizrach",
    "Selichot Ashkenaz",
    "Kinnot for Tisha B'Av",
    "Megillat Antiochus",
    "Hoshanot",
  ],
  kabbalah: [
    "Sefer Yetzirah",
    "Bahir",
    "Zohar",
    "Tikkunei Zohar",
    "Zohar Chadash",
    "Pardes Rimonim",
    "Etz Chaim",
    "Pri Etz Chaim",
    "Shaar HaKavanot",
    "Shaarei Kedushah",
    "Shaarei Orah",
    "Sefer HaTemunah",
    "Shomer Emunim",
    "Mevo Shearim",
    "Otzrot Chaim",
    "Sha'ar HaGilgulim",
    "Sha'ar HaPesukim",
    "Sha'ar HaMitzvot",
    "Sha'ar Ruach HaKodesh",
  ],
  "jewish-thought": [
    "Guide for the Perplexed",
    "Mishneh Torah, Foundations of the Torah",
    "Mishneh Torah, Human Dispositions",
    "Mishneh Torah, Repentance",
    "Sefer HaMitzvot",
    "Kuzari",
    "Emunot v'De'ot",
    "Derech Hashem",
    "The Kuzari",
    "Akeidat Yitzchak",
    "Ikkarim",
    "Ohr Hashem",
    "Sefer HaIkkarim",
    "Or Adonai",
    "The Wars of the Lord",
    "Chovat HaTalmidim",
    "Nefesh HaChaim",
    "The Way of God",
    "Hilchot Yesodei HaTorah",
    "Hilchot Teshuvah",
    "Hilchot De'ot",
    "Hilchot Talmud Torah",
    "Eight Chapters",
    "Maamar HaIkkarim",
    "Maamar Techiyat HaMetim",
  ],
  halacha: [
    "Shulchan Arukh, Orach Chayim",
    "Shulchan Arukh, Yoreh De'ah",
    "Shulchan Arukh, Even HaEzer",
    "Shulchan Arukh, Choshen Mishpat",
    "Mishnah Berurah",
    "Kitzur Shulchan Arukh",
    "Aruch HaShulchan",
    "Ben Ish Hai",
    "Chayei Adam",
    "Chochmat Adam",
    "Pri Megadim Mishbetzot Zahav on Shulchan Arukh, Orach Chayim",
    "Magen Avraham",
    "Taz on Shulchan Arukh, Orach Chayim",
    "Beit Yosef, Orach Chayim",
    "Beit Yosef, Yoreh De'ah",
    "Beit Yosef, Even HaEzer",
    "Beit Yosef, Choshen Mishpat",
    "Tur, Orach Chayim",
    "Tur, Yoreh De'ah",
    "Tur, Even HaEzer",
    "Tur, Choshen Mishpat",
    "Sefer HaChinukh",
    "Sefer Mitzvot Gadol",
    "Shulchan Aruch HaRav, Orach Chayim",
    "Shulchan Aruch HaRav, Yoreh De'ah",
  ],
  midrash: [
    "Midrash Tanchuma",
    "Midrash Rabbah",
    "Bereshit Rabbah",
    "Shemot Rabbah",
    "Vayikra Rabbah",
    "Bamidbar Rabbah",
    "Devarim Rabbah",
    "Eichah Rabbah",
    "Esther Rabbah",
    "Ruth Rabbah",
    "Shir HaShirim Rabbah",
    "Kohelet Rabbah",
    "Pirkei DeRabbi Eliezer",
    "Mekhilta DeRabbi Yishmael",
    "Sifra",
    "Sifrei Bamidbar",
    "Sifrei Devarim",
    "Tanna Devei Eliyahu Rabbah",
    "Tanna Devei Eliyahu Zuta",
    "Pesikta DeRav Kahana",
    "Pesikta Rabbati",
    "Yalkut Shimoni on Torah",
    "Midrash Tehillim",
    "Midrash Mishlei",
    "Midrash Shmuel",
  ],
  mishnah: [
    // Order Zeraim
    "Mishnah Berakhot",
    "Mishnah Peah",
    "Mishnah Demai",
    "Mishnah Kilayim",
    "Mishnah Sheviit",
    "Mishnah Terumot",
    "Mishnah Maasrot",
    "Mishnah Maaser Sheni",
    "Mishnah Challah",
    "Mishnah Orlah",
    "Mishnah Bikkurim",
    // Moed
    "Mishnah Shabbat",
    "Mishnah Eruvin",
    "Mishnah Pesachim",
    "Mishnah Shekalim",
    "Mishnah Yoma",
    "Mishnah Sukkah",
    "Mishnah Beitzah",
    "Mishnah Rosh Hashanah",
    "Mishnah Taanit",
    "Mishnah Megillah",
    "Mishnah Moed Katan",
    "Mishnah Chagigah",
    // Nashim
    "Mishnah Yevamot",
    "Mishnah Ketubot",
    "Mishnah Nedarim",
    "Mishnah Nazir",
    "Mishnah Sotah",
    "Mishnah Gittin",
    "Mishnah Kiddushin",
    // Nezikin
    "Mishnah Bava Kamma",
    "Mishnah Bava Metzia",
    "Mishnah Bava Batra",
    "Mishnah Sanhedrin",
    "Mishnah Makkot",
    "Mishnah Shevuot",
    "Mishnah Eduyot",
    "Mishnah Avodah Zarah",
    "Pirkei Avot",
    "Mishnah Horayot",
    // Kodashim
    "Mishnah Zevachim",
    "Mishnah Menachot",
    "Mishnah Chullin",
    "Mishnah Bekhorot",
    "Mishnah Arakhin",
    "Mishnah Temurah",
    "Mishnah Keritot",
    "Mishnah Meilah",
    "Mishnah Tamid",
    "Mishnah Middot",
    "Mishnah Kinnim",
    // Tahorot
    "Mishnah Keilim",
    "Mishnah Oholot",
    "Mishnah Negaim",
    "Mishnah Parah",
    "Mishnah Tahorot",
    "Mishnah Mikvaot",
    "Mishnah Niddah",
    "Mishnah Makhshirin",
    "Mishnah Zavim",
    "Mishnah Tevul Yom",
    "Mishnah Yadayim",
    "Mishnah Oktzin",
  ],
};

function run(book: string, category: string): Promise<{ book: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", path.join("scripts", "scrape-sefaria.ts"), book, category],
      { stdio: "inherit", env: { ...process.env, SCRAPE_THROTTLE_MS: "300" } }
    );
    child.on("close", (code) => resolve({ book, code: code ?? 1 }));
  });
}

async function main() {
  const onlyCat = process.env.ONLY_CAT;
  const cats = onlyCat
    ? Object.fromEntries(
        Object.entries(PLAN).filter(([k]) => onlyCat.split(",").includes(k))
      )
    : PLAN;

  let total = 0;
  for (const list of Object.values(cats)) total += list.length;
  console.log(`📚  Mega-batch: ${total} books across ${Object.keys(cats).length} categories\n`);

  const results: { book: string; category: string; code: number }[] = [];
  let i = 0;
  for (const [cat, books] of Object.entries(cats)) {
    console.log(`\n━━━ ${cat.toUpperCase()} (${books.length} books) ━━━`);
    for (const b of books) {
      i++;
      console.log(`\n[${i}/${total}] ▶ ${cat} :: ${b}`);
      const r = await run(b, cat);
      results.push({ ...r, category: cat });
    }
  }

  console.log(`\n\n=== MEGA SUMMARY ===`);
  const byCat: Record<string, { ok: number; fail: number }> = {};
  for (const r of results) {
    byCat[r.category] = byCat[r.category] || { ok: 0, fail: 0 };
    if (r.code === 0) byCat[r.category].ok++;
    else byCat[r.category].fail++;
  }
  for (const [cat, s] of Object.entries(byCat)) {
    console.log(`${cat.padEnd(18)} ✅ ${s.ok}  ❌ ${s.fail}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
