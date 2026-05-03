import mongoose, { Schema, Model } from "mongoose";
import type { IChapter } from "@/types";

const chapterSchema = new Schema<IChapter>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    number: { type: Number, required: true },
    title: {
      he: String,
      en: String,
    },
    metadata: {
      verseCount: Number,
      parashaRef: String,
      ref: String,
      heRef: String,
    },
  },
  { timestamps: true }
);

chapterSchema.index({ bookId: 1, number: 1 }, { unique: true });

export const Chapter: Model<IChapter> =
  mongoose.models.Chapter ||
  mongoose.model<IChapter>("Chapter", chapterSchema);
