import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { success, error } from "@/lib/api-response";

const VALID_CATEGORIES = ["chumash", "tehillim", "tanya", "rambam"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;

    if (!VALID_CATEGORIES.includes(category)) {
      return error(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

    await connectDB();

    const books = await Book.find({ category })
      .sort({ order: 1 })
      .select("slug title metadata.totalChapters metadata.description")
      .lean();

    return success({ category, books });
  } catch (e) {
    console.error("Texts category error:", e);
    return error("Internal server error", 500);
  }
}
