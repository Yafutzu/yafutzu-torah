<div align="center">

# Yafutzu Torah

### The Universal Torah API

**Free, open-source API for daily Jewish learning — Chitas, Rambam, and Chassidut texts.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[API Docs](#api-endpoints) | [Contributing](CONTRIBUTING.md) | [Text Status](TEXTS_STATUS.md)

</div>

---

## Mission

**Make Chitas and daily Torah learning available everywhere.**

Yafutzu Torah provides a free, public API so any developer can integrate daily Jewish learning into their website, app, or service. No API key required. No rate limits. No cost. Ever.

> *Yafutzu Ma'ayanosecha Chutza* — Let your wellsprings spread outward

## What's Included

- **Daily Chitas** — Chumash (weekly parsha, 7 daily portions), Tehillim (by day of Hebrew month), Tanya (Alter Rebbe's daily division)
- **Daily Rambam** — Both the 3-chapter and 1-chapter daily cycles of Mishneh Torah
- **Hebrew Calendar Engine** — Gregorian-Hebrew conversion, parsha lookup, leap year handling
- **Text Library** — Browse any text by category, book, chapter, and verse
- **AI-Powered** — Explanations, cross-references, and intelligent Torah search (powered by Claude)

## Quick Start

```bash
# Get today's complete Chitas
curl https://torah.yafutzu.org/api/v1/chitas/today

# Get today's Hebrew date and learning schedule
curl https://torah.yafutzu.org/api/v1/calendar/today

# Get today's daily Rambam
curl https://torah.yafutzu.org/api/v1/rambam/today

# Ask AI to explain a concept
curl "https://torah.yafutzu.org/api/v1/ai/explain?text=tanya&chapter=1&lang=en"
```

## API Endpoints

All endpoints are public. No authentication required.

### Calendar
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/calendar/today` | Today's Hebrew date + daily learning schedule |
| `GET /api/v1/calendar/:date` | Hebrew date + schedule for any date (YYYY-MM-DD) |

### Chitas
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/chitas/today` | Full daily Chitas (Chumash + Tehillim + Tanya) |
| `GET /api/v1/chitas/:date` | Chitas for any date |
| `GET /api/v1/chitas/chumash/today` | Today's Chumash portion only |
| `GET /api/v1/chitas/tehillim/today` | Today's Tehillim only |
| `GET /api/v1/chitas/tanya/today` | Today's Tanya only |

### Rambam
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/rambam/today` | Daily Rambam (3-chapter + 1-chapter cycles) |
| `GET /api/v1/rambam/3/:date` | 3-chapter cycle for a specific date |
| `GET /api/v1/rambam/1/:date` | 1-chapter cycle for a specific date |

### Texts
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/texts/:category` | List books in a category |
| `GET /api/v1/texts/:category/:book` | Book metadata + chapters |
| `GET /api/v1/texts/:category/:book/:chapter` | Full chapter text |
| `GET /api/v1/texts/:category/:book/:chapter/:verse` | Single verse |

### AI
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/ai/explain` | AI explanation of a text passage |
| `GET /api/v1/ai/search?q=...` | Intelligent Torah search |
| `GET /api/v1/ai/connections/:book/:chapter/:verse` | Cross-references and related texts |

### Response Format

All endpoints return consistent JSON:

```json
{
  "ok": true,
  "date": {
    "gregorian": "2026-03-27",
    "hebrew": { "day": 9, "month": 1, "monthName": "Nisan", "year": 5786 }
  },
  "data": { ... }
}
```

## Contributing

We need your help! This is a community project and there are many ways to contribute:

| Contribution | Skills Needed | Difficulty |
|-------------|--------------|------------|
| **Add Hebrew texts** | Can read Hebrew | Easy |
| **Add translations** | Bilingual (Hebrew + English) | Easy |
| **Verify schedules** | Torah knowledge | Medium |
| **Code features** | TypeScript, Next.js | Medium |
| **AI integration** | AI/ML, prompt engineering | Advanced |

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions and [TEXTS_STATUS.md](TEXTS_STATUS.md) to see what texts still need to be added.

### Quick Contribution: Add a Text

1. Fork the repo
2. Add your text as a JSON file in `data/raw/{category}/`
3. Run `npm run validate` to check your format
4. Submit a PR

```json
{
  "book": "bereishit",
  "chapter": 1,
  "verses": [
    {
      "number": 1,
      "he": "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
      "en": "In the beginning God created the heavens and the earth"
    }
  ]
}
```

## Development Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

### Install & Run

```bash
git clone https://github.com/yafutzu/yafutzu-torah.git
cd yafutzu-torah
npm install
cp .env.local.example .env.local  # Edit with your MongoDB URI
npm run dev                        # Starts on http://localhost:3000
```

### Project Structure

```
src/
  app/api/v1/     # Public REST API routes
  app/            # Web reader UI
  lib/            # Core services (calendar, DB, AI)
  models/         # MongoDB schemas
  components/     # React components
data/
  raw/            # Source text files (contribute here!)
  schedules/      # Daily learning schedule mappings
scripts/          # Seed and validation scripts
```

## Tech Stack

- **Next.js** + TypeScript — API + web reader in one codebase
- **MongoDB** + Mongoose — structured text storage
- **@hebcal/core** — Hebrew calendar engine
- **Claude AI** — text explanations and search
- **Tailwind CSS** — clean reading UI

## License

MIT License. Torah belongs to everyone.

---

<div align="center">

**Part of the [Yafutzu](https://yafutzu.org) ecosystem**

*Let your wellsprings spread outward*

</div>
