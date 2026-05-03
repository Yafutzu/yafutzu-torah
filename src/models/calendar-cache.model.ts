import mongoose, { Schema, Model } from "mongoose";
import type { ICalendarCache } from "@/types";

const calendarCacheSchema = new Schema<ICalendarCache>(
  {
    gregorianDate: { type: String, required: true, unique: true },
    hebrewDate: {
      day: { type: Number, required: true },
      month: { type: Number, required: true },
      monthName: { type: String, required: true },
      year: { type: Number, required: true },
    },
    parsha: { type: String, required: true },
    parshaDay: { type: Number, required: true },
    tehillimDay: { type: Number, required: true },
    tanyaKey: { type: String, required: true },
    rambam3CycleDay: { type: Number, required: true },
    rambam1CycleDay: { type: Number, required: true },
    isShabbos: { type: Boolean, required: true },
    isYomTov: { type: Boolean, default: false },
    yomTovName: String,
  },
  { timestamps: true }
);

export const CalendarCache: Model<ICalendarCache> =
  mongoose.models.CalendarCache ||
  mongoose.model<ICalendarCache>("CalendarCache", calendarCacheSchema);
