import { notFound } from "next/navigation";
import {
  listPerekFiles,
  loadGlossary,
  loadPerek,
} from "@/lib/it-demo-loader";
import { ItDemoReader } from "@/components/ItDemoReader";
import type { Metadata } from "next";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const perek = loadPerek(slug);
  return {
    title: perek
      ? `${perek.name_it} · Yafutzu Torah`
      : "Capitolo · Yafutzu Torah",
  };
}

export default async function ItDemoChapterPage({ params }: PageParams) {
  const { slug } = await params;
  const perek = loadPerek(slug);
  if (!perek) notFound();

  const all = listPerekFiles();
  const idx = all.findIndex((x) => x.slug === slug);
  const prevSlug = idx > 0 ? all[idx - 1].slug : null;
  const nextSlug = idx < all.length - 1 ? all[idx + 1].slug : null;

  const glossary = loadGlossary();

  return (
    <main className="min-h-screen bg-stone-50">
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
          <a
            href="/it-demo"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Italiano
          </a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500 truncate">{perek.ref}</span>
        </div>
      </header>

      <ItDemoReader
        sefariaRef={perek.ref}
        name_he={perek.name_he}
        name_it={perek.name_it}
        date={perek.date}
        halachot={perek.halachot}
        glossary={glossary.terms}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
      />
    </main>
  );
}
