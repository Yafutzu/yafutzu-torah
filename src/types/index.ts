import { Types } from "mongoose";

// Database document interfaces
export interface IBook {
  _id: Types.ObjectId;
  slug: string;
  title: { he: string; en: string };
  category:
    | "chumash"
    | "tehillim"
    | "tanya"
    | "rambam"
    | "tanakh"
    | "chasidut"
    | "mussar"
    | "kabbalah"
    | "liturgy"
    | "jewish-thought"
    | "halacha"
    | "midrash"
    | "mishnah"
    | "commentary";
  order: number;
  metadata: {
    totalChapters: number;
    author?: string;
    description?: { he: string; en: string };
    /** ISO 639-1 codes for languages with translations, e.g. ['he','it','en'] */
    languages?: string[];
  };
}

export interface IChapter {
  _id: Types.ObjectId;
  bookId: Types.ObjectId;
  number: number;
  title?: { he: string; en: string };
  metadata: {
    verseCount?: number;
    parashaRef?: string;
  };
}

export interface IVerse {
  _id: Types.ObjectId;
  bookId: Types.ObjectId;
  chapterId: Types.ObjectId;
  number: number;
  text: {
    he: string;
    he_plain?: string;
    en?: string;
    it?: string;
  };
  metadata: {
    parashaDay?: number;
    tanyaDay?: string;
  };
}

export interface ITextReference {
  bookId: Types.ObjectId;
  chapterId: Types.ObjectId;
  fromVerse: number;
  toVerse: number;
}

export interface IDailySchedule {
  _id: Types.ObjectId;
  type:
    | "chitas-chumash"
    | "chitas-tehillim"
    | "chitas-tanya"
    | "rambam-3"
    | "rambam-1";
  key: string;
  references: ITextReference[];
  title: { he: string; en: string };
  description?: { he: string; en: string };
}

export interface IHebrewDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

export interface ICalendarCache {
  _id: Types.ObjectId;
  gregorianDate: string;
  hebrewDate: IHebrewDate;
  parsha: string;
  parshaDay: number;
  tehillimDay: number;
  tanyaKey: string;
  rambam3CycleDay: number;
  rambam1CycleDay: number;
  isShabbos: boolean;
  isYomTov: boolean;
  yomTovName?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  ok: boolean;
  date?: {
    gregorian: string;
    hebrew: IHebrewDate;
  };
  data?: T;
  error?: string;
}

export interface DailyChitas {
  chumash: {
    parsha: string;
    day: number;
    title: { he: string; en: string };
    text: { he: string; en?: string }[];
  };
  tehillim: {
    dayOfMonth: number;
    chapters: number[];
    title: { he: string; en: string };
    text: { he: string; en?: string }[];
  };
  tanya: {
    title: { he: string; en: string };
    text: { he: string; en?: string }[];
  };
}

export interface DailyRambam {
  threeChapter: {
    cycleDay: number;
    chapters: {
      book: string;
      section: string;
      chapter: number;
      title: { he: string; en: string };
      text: { he: string; en?: string }[];
    }[];
  };
  oneChapter: {
    cycleDay: number;
    chapter: {
      book: string;
      section: string;
      chapter: number;
      title: { he: string; en: string };
      text: { he: string; en?: string }[];
    };
  };
}

// Schedule data file types
export interface TehillimMonthlyEntry {
  day: number;
  chapters: number[];
}

export interface ChumashParshaEntry {
  parsha: string;
  parshaHe: string;
  book: string;
  days: {
    day: number;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
  }[];
}

export interface TanyaDailyEntry {
  date: string;
  section: string;
  fromChapter: number;
  fromParagraph: number;
  toChapter: number;
  toParagraph: number;
  title: { he: string; en: string };
}

export interface RambamCycleEntry {
  cycleDay: number;
  chapters: {
    book: string;
    section: string;
    chapter: number;
  }[];
}
