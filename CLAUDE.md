@AGENTS.md

# Yafutzu Torah

Chassidut text platform with free public API. Part of the Yafutzu ecosystem.

## Tech Stack
- Next.js (App Router) + TypeScript
- MongoDB + Mongoose
- @hebcal/core for Hebrew calendar
- Tailwind CSS

## Project Structure
- `src/app/api/v1/` — Public REST API (no auth required)
- `src/app/` — Web reader UI pages
- `src/lib/` — Core services (db, hebrew-calendar, daily-resolver, api-response)
- `src/models/` — Mongoose schemas (Book, Chapter, Verse, DailySchedule, CalendarCache)
- `src/components/` — React components
- `src/types/` — TypeScript interfaces
- `data/schedules/` — Static JSON schedule mappings
- `data/raw/` — Raw text source files
- `scripts/` — Seed and data generation scripts

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npx tsx scripts/seed-*.ts` — Run seed scripts

## Conventions
- API responses always use `{ ok: true, data: ... }` or `{ ok: false, error: "..." }` format
- All API routes include CORS headers (`Access-Control-Allow-Origin: *`)
- Hebrew text stored with nikud; `he_plain` field without nikud for search
- Date parameters accept YYYY-MM-DD format
- All API routes are under `/api/v1/` prefix
- RTL text wrapped in `<div dir="rtl" lang="he">`

## Important Notes
- This is a SEPARATE project from Yafutzu social platform — never mix contexts
- API is free and public, no authentication layer
- Hebrew calendar math uses @hebcal/core — never import it directly outside `src/lib/hebrew-calendar.ts`
- MongoDB connection uses singleton pattern in `src/lib/db.ts`
