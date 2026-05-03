import { listPerekFiles } from "@/lib/it-demo-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio quotidiano in italiano | Yafutzu Torah",
};

export default function ItDemoIndex() {
  const files = listPerekFiles();

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm" dir="rtl">
                ת
              </span>
            </div>
            <span className="font-semibold text-stone-800 text-sm">
              Yafutzu Torah
            </span>
          </a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">Studio italiano</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Studio quotidiano · Italiano
        </h1>
        <p className="text-stone-600 mb-2">
          Traduzione fedele dei capitoli del Mishneh Torah secondo il ciclo dei
          tre perakim quotidiani (Rambam-3).
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-8">
          Termini halachici sottolineati: cliccaci sopra per vedere la
          definizione e l'origine ebraica.
        </p>

        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.slug}
              className="bg-white rounded-lg border border-stone-200 hover:border-amber-400 transition-colors"
            >
              <a
                href={`/it-demo/${f.slug}`}
                className="block px-4 py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-medium text-stone-900">{f.ref}</div>
                  {f.date && (
                    <div className="text-xs text-stone-500 mt-0.5">
                      Data: {f.date}
                    </div>
                  )}
                </div>
                <span className="text-amber-600">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
