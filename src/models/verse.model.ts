import mongoose, { Schema, Model } from "mongoose";
import type { IVerse } from "@/types";

const verseSchema = new Schema<IVerse>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    number: { type: Number, required: true },
    text: {
      he: { type: String, required: true },
      he_plain: String,
      en: String,
      it: String,
    },
    metadata: {
      parashaDay: Number,
      tanyaDay: String,
    },
  },
  { timestamps: true }
);

verseSchema.index({ chapterId: 1, number: 1 }, { unique: true });
verseSchema.index({ bookId: 1 });
verseSchema.index({ "text.he_plain": "text" });

export const Verse: Model<IVerse> =
  mongoose.models.Verse || mongoose.model<IVerse>("Verse", verseSchema);
