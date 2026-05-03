import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      category: string;
      book: string;
      chapter: string;
      verse: string;
    }>;
  }
) {
  try {
    const {
      category,
      book: bookSlug,
      chapter: chapterNum,
      verse: verseNum,
    } = await params;

    const chapN = parseInt(chapterNum);
    const verseN = parseInt(verseNum);
    if (isNaN(chapN) || isNaN(verseN))
      return error("Invalid chapter or verse number", 400);

    await connectDB();

    const book = await Book.findOne({ slug: bookSlug, category }).lean();
    if (!book) return error("Book not found", 404);

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

    return success({
      book: { slug: book.slug, title: book.title },
      chapter: { number: chapter.number, title: chapter.title },
      verse,
    });
  } catch (e) {
    console.error("Texts verse error:", e);
    return error("Internal server error", 500);
  }
}
