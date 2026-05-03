import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { findConnections, isAIAvailable } from "@/lib/ai";
import { success, error } from "@/lib/api-response";
import { NextRequest } from "next/server";

/**
 * GET /api/v1/ai/connections/bereishit/1/1?lang=en
 */
export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ book: string; chapter: string; verse: string }> }
) {
  try {
    if (!isAIAvailable()) {
      return error("AI features are not configured on this server", 503);
    }

    const { book: bookSlug, chapter: chapterNum, verse: verseNum } = await params;
    const lang =
      (req.nextUrl.searchParams.get("lang") as "en" | "he") || "en";

    const chapN = parseInt(chapterNum);
    const verseN = parseInt(verseNum);
    if (isNaN(chapN) || isNaN(verseN)) {
      return error("Invalid chapter or verse number", 400);
    }

    await connectDB();

    const book = await Book.findOne({ slug: bookSlug }).lean();
    if (!book) return error(`Book "${bookSlug}" not found`, 404);

    const chapter = await Chapter.findOne({
      bookId: book._id,
      number: chapN,
    }).lean();
    if (!chapter) return error("Chapter not found", 404);

    const verse = await Verse.findOne({
      chapterId: chapter._id,
      number: verseN,
    })
      .select("number text")
      .lean();
    if (!verse) return error("Verse not found", 404);

    const result = await findConnections({
      book: book.title.en,
      chapter: chapN,
      verse: verseN,
      text: verse.text.he,
      lang,
    });

    if (!result) {
      return error("AI connections lookup failed", 500);
    }

    return success({
      source: {
        book: book.title.en,
        chapter: chapN,
        verse: verseN,
        text: verse.text,
      },
      ...result,
    });
  } catch (e) {
    console.error("AI connections error:", e);
    return error("Internal server error", 500);
  }
}
