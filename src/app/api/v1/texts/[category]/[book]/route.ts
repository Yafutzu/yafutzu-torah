import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string; book: string }> }
) {
  try {
    const { category, book: bookSlug } = await params;

    await connectDB();

    const book = await Book.findOne({ slug: bookSlug, category }).lean();
    if (!book) return error("Book not found", 404);

    const chapters = await Chapter.find({ bookId: book._id })
      .sort({ number: 1 })
      .select("number title metadata.verseCount")
      .lean();

    return success({ book, chapters });
  } catch (e) {
    console.error("Texts book error:", e);
    return error("Internal server error", 500);
  }
}
