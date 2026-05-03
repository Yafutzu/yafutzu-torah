import mongoose, { Schema, Model } from "mongoose";
import type { IDailySchedule } from "@/types";

const textReferenceSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    fromVerse: { type: Number, required: true },
    toVerse: { type: Number, required: true },
  },
  { _id: false }
);

const dailyScheduleSchema = new Schema<IDailySchedule>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "chitas-chumash",
        "chitas-tehillim",
        "chitas-tanya",
        "rambam-3",
        "rambam-1",
      ],
    },
    key: { type: String, required: true },
    references: [textReferenceSchema],
    title: {
      he: { type: String, required: true },
      en: { type: String, required: true },
    },
    description: {
      he: String,
      en: String,
    },
  },
  { timestamps: true }
);

dailyScheduleSchema.index({ type: 1, key: 1 }, { unique: true });

export const DailySchedule: Model<IDailySchedule> =
  mongoose.models.DailySchedule ||
  mongoose.model<IDailySchedule>("DailySchedule", dailyScheduleSchema);
