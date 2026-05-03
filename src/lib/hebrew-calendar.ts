import { HDate, Sedra, parshiot } from "@hebcal/core";

export interface HebrewDateInfo {
  day: number;
  month: number;
  monthName: string;
  year: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  isShabbos: boolean;
}

export interface ParshaInfo {
  parsha: string;
  parshaHe: string;
  dayInParsha: number; // 1=Sunday through 7=Shabbos
}

/**
 * Get Hebrew date information for a Gregorian date
 */
export function getHebrewDate(date: Date): HebrewDateInfo {
  const hd = new HDate(date);
  return {
    day: hd.getDate(),
    month: hd.getMonth(),
    monthName: hd.getMonthName(),
    year: hd.getFullYear(),
    dayOfWeek: hd.getDay(),
    isShabbos: hd.getDay() === 6,
  };
}

/**
 * Get the parsha (weekly Torah portion) for a given date.
 * Uses the Sedra class to find the upcoming Shabbos reading.
 * Returns null during chag weeks when no regular parsha is read.
 */
export function getParshaForDate(date: Date): ParshaInfo | null {
  const hd = new HDate(date);
  const dayOfWeek = hd.getDay(); // 0=Sun, 6=Sat

  // Find the upcoming Shabbos (or today if Shabbos)
  const daysUntilShabbos = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const shabbosDate = new HDate(hd.abs() + daysUntilShabbos);

  // Use Sedra for reliable parsha lookup (diaspora = false for now)
  const sedra = new Sedra(shabbosDate.getFullYear(), false);
  const result = sedra.lookup(shabbosDate);

  // During chag weeks, no regular parsha is read
  if (result.chag) return null;

  // Handle double parshiot (e.g., "Tazria-Metzora")
  const parshaNames = result.parsha as string[];
  const parsha = parshaNames.join("-");

  return {
    parsha,
    parshaHe: parsha, // TODO: add Hebrew parsha names mapping
    dayInParsha: dayOfWeek === 6 ? 7 : dayOfWeek + 1, // 1=Sunday, 7=Shabbos
  };
}

/**
 * Get the day of the Hebrew month (for Tehillim daily division)
 */
export function getDayOfMonth(date: Date): number {
  const hd = new HDate(date);
  return hd.getDate();
}

/**
 * Check if a Hebrew year is a leap year (has Adar II)
 */
export function isLeapYear(hebrewYear: number): boolean {
  return HDate.isLeapYear(hebrewYear);
}

/**
 * Get Tanya daily key for a given date.
 * Format: "day-month" (e.g., "1-tishrei", "15-adar-ii")
 */
export function getTanyaKey(date: Date): string {
  const hd = new HDate(date);
  const day = hd.getDate();
  const monthName = hd.getMonthName().toLowerCase().replace(" ", "-");
  return `${day}-${monthName}`;
}

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to a Date object
 */
export function parseGregorianDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Convert a Hebrew date to Gregorian
 */
export function hebrewToGregorian(
  year: number,
  month: number,
  day: number
): Date {
  const hd = new HDate(day, month, year);
  return hd.greg();
}

/**
 * Format today's date as YYYY-MM-DD
 */
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get the Rambam 3-chapter cycle day number.
 * The cycle started on 27 Iyar 5744 (May 29, 1984).
 * Total cycle = 1017 chapters, repeating.
 */
export function getRambam3CycleDay(date: Date): number {
  const cycleStart = new Date(1984, 4, 29); // May 29, 1984
  const diffDays = Math.floor(
    (date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return ((diffDays % 339) + 339) % 339; // 339 days per cycle (1017 chapters / 3)
}

/**
 * Get the Rambam 1-chapter cycle day number.
 * Same start date, but 1 chapter per day = 1017 day cycle.
 */
export function getRambam1CycleDay(date: Date): number {
  const cycleStart = new Date(1984, 4, 29);
  const diffDays = Math.floor(
    (date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return ((diffDays % 1017) + 1017) % 1017;
}

/**
 * Get all available parsha names
 */
export function getAllParshiot(): string[] {
  return [...parshiot];
}
