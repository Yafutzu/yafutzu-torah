import { connectDB } from "./db";
import {
  getHebrewDate,
  getParshaForDate,
  getDayOfMonth,
  getTanyaKey,
  getRambam3CycleDay,
  getRambam1CycleDay,
  parseGregorianDate,
} from "./hebrew-calendar";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { DailySchedule } from "@/models/daily-schedule.model";
import type { IHebrewDate } from "@/types";

export interface ResolvedDate {
  gregorian: string;
  hebrew: IHebrewDate;
  parsha: string | null;
  parshaDay: number;
  tehillimDay: number;
  tanyaKey: string;
  rambam3CycleDay: number;
  rambam1CycleDay: number;
}

/**
 * Resolve a date string or Date to all daily learning parameters
 */
export function resolveDate(input: string | Date): ResolvedDate | null {
  const date = typeof input === "string" ? parseGregorianDate(input) : input;
  if (!date) return null;

  const hd = getHebrewDate(date);
  const parshaInfo = getParshaForDate(date);
  const gregorian = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return {
    gregorian,
    hebrew: {
      day: hd.day,
      month: hd.month,
      monthName: hd.monthName,
      year: hd.year,
    },
    parsha: parshaInfo?.parsha ?? null,
    parshaDay: parshaInfo?.dayInParsha ?? 0,
    tehillimDay: getDayOfMonth(date),
    tanyaKey: getTanyaKey(date),
    rambam3CycleDay: getRambam3CycleDay(date),
    rambam1CycleDay: getRambam1CycleDay(date),
  };
}

/**
 * Fetch daily Chitas texts from the database
 */
export async function fetchChitas(resolved: ResolvedDate) {
  await connectDB();

  const [chumash, tehillim, tanya] = await Promise.all([
    fetchChumashPortion(resolved),
    fetchTehillimPortion(resolved),
    fetchTanyaPortion(resolved),
  ]);

  return { chumash, tehillim, tanya };
}

/**
 * Fetch daily Chumash portion
 */
async function fetchChumashPortion(resolved: ResolvedDate) {
  if (!resolved.parsha) return null;

  const schedule = await DailySchedule.findOne({
    type: "chitas-chumash",
    key: `${resolved.parsha}-${resolved.parshaDay}`,
  });

  if (!schedule) return null;

  const verses = await fetchVersesForReferences(schedule.references);

  return {
    parsha: resolved.parsha,
    day: resolved.parshaDay,
    title: schedule.title,
    verses,
  };
}

/**
 * Fetch daily Tehillim portion
 */
async function fetchTehillimPortion(resolved: ResolvedDate) {
  const schedule = await DailySchedule.findOne({
    type: "chitas-tehillim",
    key: String(resolved.tehillimDay),
  });

  if (!schedule) return null;

  const verses = await fetchVersesForReferences(schedule.references);

  return {
    dayOfMonth: resolved.tehillimDay,
    title: schedule.title,
    verses,
  };
}

/**
 * Fetch daily Tanya portion
 */
async function fetchTanyaPortion(resolved: ResolvedDate) {
  const schedule = await DailySchedule.findOne({
    type: "chitas-tanya",
    key: resolved.tanyaKey,
  });

  if (!schedule) return null;

  const verses = await fetchVersesForReferences(schedule.references);

  return {
    title: schedule.title,
    verses,
  };
}

/**
 * Fetch Rambam daily chapters
 */
export async function fetchRambam(resolved: ResolvedDate) {
  await connectDB();

  const [threeChapter, oneChapter] = await Promise.all([
    fetchRambamCycle(resolved, "rambam-3", resolved.rambam3CycleDay),
    fetchRambamCycle(resolved, "rambam-1", resolved.rambam1CycleDay),
  ]);

  return { threeChapter, oneChapter };
}

async function fetchRambamCycle(
  resolved: ResolvedDate,
  type: "rambam-3" | "rambam-1",
  cycleDay: number
) {
  const schedule = await DailySchedule.findOne({
    type,
    key: String(cycleDay),
  });

  if (!schedule) return null;

  const verses = await fetchVersesForReferences(schedule.references);

  return {
    cycleDay,
    title: schedule.title,
    verses,
  };
}

/**
 * Fetch all verses for a set of references
 */
async function fetchVersesForReferences(
  references: { bookId: any; chapterId: any; fromVerse: number; toVerse: number }[]
) {
  const allVerses = [];

  for (const ref of references) {
    const verses = await Verse.find({
      chapterId: ref.chapterId,
      number: { $gte: ref.fromVerse, $lte: ref.toVerse },
    })
      .sort({ number: 1 })
      .select("number text")
      .lean();

    allVerses.push(...verses);
  }

  return allVerses;
}
