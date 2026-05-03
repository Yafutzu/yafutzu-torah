import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { explainText, isAIAvailable } from "@/lib/ai";
import { success, error } from "@/lib/api-response";

/**
 * GET /api/v1/ai/explain?book=bereishit&chapter=1&verse=1&lang=en
 * GET /api/v1/ai/explain?text=tanya&chapter=1&lang=he
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAIAvailable()) {
      return error("AI features are not configured on this server", 503);
    }

    const { searchParams } = req.nextUrl;
    const bookSlug = searchParams.get("book") || searchParams.get("text");
    const chapterNum = searchParams.get("chapter");
    const verseNum = searchParams.get("verse");
    const lang = (searchParams.get("lang") as "en" | "he") || "en";

    if (!bookSlug || !chapterNum) {
      return error("Required: book (or text) and chapter parameters", 400);
    }

    await connectDB();

    const book = await Book.findOne({ slug: bookSlug }).lean();
    if (!book) return error(`Book "${bookSlug}" not found`, 404);

    const chapter = await Chapter.findOne({
      bookId: book._id,
      number: parseInt(chapterNum),
    }).lean();
    if (!chapter) return error("Chapter not found", 404);

    // Get verses — either a specific verse or the whole chapter
    const query: Record<string, unknown> = { chapterId: chapter._id };
    if (verseNum) query.number = parseInt(verseNum);

    const verses = await Verse.find(query)
      .sort({ number: 1 })
      .select("number text")
      .lean();

    if (verses.length === 0) {
      return error("No text found for this reference", 404);
    }

    const hebrewText = verses.map((v) => v.text.he).join(" ");
    const source = `${book.title.en} Chapter ${chapterNum}${verseNum ? `:${verseNum}` : ""}`;

    const explanation = await explainText({
      text: hebrewText,
      source,
      lang,
    });

    if (!explanation) {
      return error("AI explanation failed", 500);
    }

    return success({
      source,
      text: hebrewText,
      explanation,
      lang,
    });
  } catch (e) {
    console.error("AI explain error:", e);
    return error("Internal server error", 500);
  }
}
