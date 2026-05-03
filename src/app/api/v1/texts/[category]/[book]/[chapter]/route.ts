import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  {
    params,
  }: { params: Promise<{ category: string; book: string; chapter: string }> }
) {
  try {
    const { category, book: bookSlug, chapter: chapterNum } = await params;
    const num = parseInt(chapterNum);
    if (isNaN(num)) return error("Invalid chapter number", 400);

    await connectDB();

    const book = await Book.findOne({ slug: bookSlug, category }).lean();
    if (!book) return error("Book not found", 404);

    const chapter = await Chapter.findOne({
      bookId: book._id,
      number: num,
    }).lean();
    if (!chapter) return error("Chapter not found", 404);

    const verses = await Verse.find({ chapterId: chapter._id })
      .sort({ number: 1 })
      .select("number text")
      .lean();

    // Derive which translation languages are actually present in this chapter
    const langSet = new Set<string>(["he"]);
    for (const v of verses) {
      if (v.text.en) langSet.add("en");
      if (v.text.it) langSet.add("it");
    }

    return success({
      book: {
        slug: book.slug,
        title: book.title,
        availableLanguages: book.metadata.languages ?? Array.from(langSet),
      },
      chapter: { number: chapter.number, title: chapter.title },
      availableLanguages: Array.from(langSet),
      verses,
    });
  } catch (e) {
    console.error("Texts chapter error:", e);
    return error("Internal server error", 500);
  }
}
