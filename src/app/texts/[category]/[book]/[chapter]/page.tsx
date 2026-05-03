import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { Verse } from "@/models/verse.model";
import { ChapterReader } from "@/components/ChapterReader";
import type { Metadata } from "next";

interface PageParams {
  params: Promise<{ category: string; book: string; chapter: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const num = parseInt(chapterStr);
  return {
    title: `Chapter ${num} — ${bookSlug} | Yafutzu Torah`,
  };
}

export default async function ChapterPage({ params }: PageParams) {
  const { category, book: bookSlug, chapter: chapterStr } = await params;
  const num = parseInt(chapterStr);
  if (isNaN(num) || num < 1) notFound();

  await connectDB();

  const book = await Book.findOne({ slug: bookSlug, category }).lean();
  if (!book) notFound();

  const chapter = await Chapter.findOne({ bookId: book._id, number: num }).lean();
  if (!chapter) notFound();

  const verses = await Verse.find({ chapterId: chapter._id })
    .sort({ number: 1 })
    .select("number text")
    .lean();

  if (verses.length === 0) notFound();

  // Serialize for client component (strip Mongoose internals)
  const serializedVerses = verses.map((v) => ({
    number: v.number,
    text: {
      he: v.text.he,
      he_plain: v.text.he_plain,
      en: v.text.en,
      it: v.text.it,
    },
  }));

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Site header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm" dir="rtl">
                ת
              </span>
            </div>
            <span className="font-semibold text-stone-800 text-sm hidden sm:inline">
              Yafutzu Torah
            </span>
          </a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500 capitalize">{category}</span>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">{book.title.en}</span>
        </div>
      </header>

      <ChapterReader
        book={{ slug: book.slug, title: book.title }}
        chapter={{
          number: chapter.number,
          title: chapter.title as { he?: string; en?: string } | undefined,
          totalChapters: book.metadata.totalChapters,
        }}
        verses={serializedVerses}
      />
    </main>
  );
}
