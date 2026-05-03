import mongoose, { Schema, Model } from "mongoose";
import type { IBook } from "@/types";

const bookSchema = new Schema<IBook>(
  {
    slug: { type: String, required: true, unique: true },
    title: {
      he: { type: String, required: true },
      en: { type: String, required: true },
    },
    category: {
      type: String,
      required: true,
      enum: [
        "chumash",
        "tehillim",
        "tanya",
        "rambam",
        "tanakh",
        "chasidut",
        "mussar",
        "kabbalah",
        "liturgy",
        "jewish-thought",
        "halacha",
        "midrash",
        "mishnah",
        "commentary",
      ],
    },
    order: { type: Number, required: true },
    metadata: {
      totalChapters: { type: Number, required: true },
      author: String,
      description: {
        he: String,
        en: String,
      },
      /** ISO 639-1 codes for available translation languages, e.g. ['he','it'] */
      languages: [String],
    },
  },
  { timestamps: true }
);

bookSchema.index({ category: 1, order: 1 });

export const Book: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>("Book", bookSchema);
