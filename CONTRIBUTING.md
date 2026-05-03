# Contributing to Yafutzu Torah

Thank you for wanting to help make Torah accessible everywhere! This guide covers all the ways you can contribute.

## Ways to Contribute

### 1. Add Hebrew Texts (No coding required!)

The most impactful contribution. We need Hebrew texts for Chumash, Tehillim, Tanya, and Rambam.

**How:**
1. Pick an unclaimed text from [TEXTS_STATUS.md](TEXTS_STATUS.md)
2. Create a JSON file in `data/raw/{category}/`
3. Follow the format below
4. Run `npm run validate` to check your file
5. Submit a Pull Request

**Text file format:**

```json
{
  "book": "bereishit",
  "category": "chumash",
  "chapter": 1,
  "title": { "he": "פרק א", "en": "Chapter 1" },
  "verses": [
    {
      "number": 1,
      "he": "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
      "en": "In the beginning God created the heavens and the earth"
    },
    {
      "number": 2,
      "he": "וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ...",
      "en": "And the earth was formless and void..."
    }
  ]
}
```

**Guidelines for text entry:**
- Hebrew text should include nikud (vowel marks) when possible
- English translation is optional but very welcome
- One file per chapter
- File naming: `{book}-{chapter}.json` (e.g., `bereishit-1.json`)
- Use UTF-8 encoding

### 2. Add Translations

If you're bilingual, help translate existing Hebrew texts to English.

**How:**
1. Find a text file that has `he` but no `en` field
2. Add the `en` translations
3. Submit a PR

### 3. Verify Daily Schedules

If you have Torah knowledge, help verify our daily learning schedule mappings:

- **Chitas Chumash** — Verify parsha-to-day divisions match standard practice
- **Tehillim** — Verify monthly chapter divisions
- **Tanya** — Verify daily divisions match the Alter Rebbe's original calendar
- **Rambam** — Verify 3-chapter and 1-chapter cycle mappings

Schedule files are in `data/schedules/`.

### 4. Code Contributions

**Setup:**
```bash
git clone https://github.com/yafutzu/yafutzu-torah.git
cd yafutzu-torah
npm install
cp .env.local.example .env.local
npm run dev
```

**Areas we need help with:**
- API endpoints and performance
- Web reader UI improvements
- Mobile app (React Native)
- Search functionality
- AI integration features
- Testing and documentation

**Code conventions:**
- TypeScript strict mode
- API responses use `{ ok: true, data }` / `{ ok: false, error }` format
- Hebrew calendar logic stays in `src/lib/hebrew-calendar.ts` only
- All API routes under `/api/v1/`
- RTL text uses `dir="rtl" lang="he"`

### 5. Report Issues

Found a bug? Text error? Wrong daily portion?

- Use the appropriate [issue template](.github/ISSUE_TEMPLATE/)
- For text corrections, include the book, chapter, and verse number
- For schedule issues, include the date and what the correct reading should be

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run validate` if you added text files
4. Run `npm run build` to ensure no build errors
5. Submit a PR with a clear description

**PR title format:**
- Text additions: `text: Add Bereishit chapters 1-10`
- Translations: `translation: Add English for Tanya chapter 1`
- Schedule fixes: `schedule: Fix Rambam cycle day 42 mapping`
- Code: `feat: Add search endpoint` / `fix: Calendar leap year edge case`

## Text Accuracy

Torah text accuracy is critical. Our verification process:

1. **Contributor submits** text via PR
2. **Automated validation** checks JSON format and structure
3. **Community review** — at least 1 reviewer with Torah knowledge
4. **Merge and tag** as verified/unverified

Texts are tagged with a confidence level:
- `verified` — Reviewed and confirmed accurate
- `unverified` — Submitted but not yet reviewed
- `draft` — Work in progress

## Code of Conduct

- Be respectful and welcoming
- Keep discussions focused on the project
- Torah-related discussions should remain objective and inclusive of all Jewish communities
- All text contributions should be from public domain sources

## Questions?

Open a [Discussion](https://github.com/yafutzu/yafutzu-torah/discussions) or reach out to the maintainers.

---

*Every verse you add makes Torah more accessible. Thank you!*
