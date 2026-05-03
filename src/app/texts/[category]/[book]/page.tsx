import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Book } from "@/models/book.model";
import { Chapter } from "@/models/chapter.model";
import { langLabel } from "@/lib/language";
import type { Metadata } from "next";

interface PageParams {
  params: Promise<{ category: string; book: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { book: bookSlug } = await params;
  return {
    title: `${bookSlug} | Yafutzu Torah`,
  };
}

export default async function BookPage({ params }: PageParams) {
  const { category, book: bookSlug } = await params;

  await connectDB();

  const book = await Book.findOne({ slug: bookSlug, category }).lean();
  if (!book) notFound();

  const chapters = await Chapter.find({ bookId: book._id })
    .sort({ number: 1 })
    .select("number title metadata")
    .lean();

  const availableLanguages = book.metadata.languages ?? ["he"];

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
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
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Book title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">{book.title.en}</h1>
          <p className="text-xl text-stone-500 mt-1" dir="rtl">
            {book.title.he}
          </p>
          {book.metadata.description?.en && (
            <p className="text-sm text-stone-500 mt-2">
              {book.metadata.description.en}
            </p>
          )}

          {/* Available languages badge */}
          {availableLanguages.length > 1 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-stone-400">Translations:</span>
              {availableLanguages.filter((l) => l !== "he").map((code) => (
                <span
                  key={code}
                  className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                >
                  {langLabel(code)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chapter list */}
        <div className="grid gap-2">
          {chapters.map((ch) => (
            <a
              key={ch.number}
              href={`/texts/${category}/${bookSlug}/${ch.number}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200 hover:border-amber-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 text-sm font-bold flex items-center justify-center">
                  {ch.number}
                </span>
                <div>
                  {ch.title?.en && (
                    <p className="font-medium text-stone-800 group-hover:text-stone-900">
                      {ch.title.en}
                    </p>
                  )}
                  {ch.title?.he ? (
                    <p className="text-sm text-stone-500" dir="rtl">
                      {ch.title.he}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-400">
                      Chapter {ch.number}
                      {ch.metadata?.verseCount
                        ? ` · ${ch.metadata.verseCount} halachot`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-stone-400 group-hover:text-stone-600">→</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
