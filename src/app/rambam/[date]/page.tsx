import { notFound } from "next/navigation";
import { loadRambamDay, parseDateYMD } from "@/lib/rambam-day-loader";
import { loadGlossary } from "@/lib/it-demo-loader";
import { RambamDayReader } from "@/components/RambamDayReader";
import type { Metadata } from "next";

interface PageParams {
  params: Promise<{ date: string }>;
}

function shiftDate(ymd: string, days: number): string {
  const d = parseDateYMD(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Rambam · ${date} · Yafutzu Torah`,
  };
}

export default async function RambamDatePage({ params }: PageParams) {
  const { date } = await params;
  const d = parseDateYMD(date);
  if (!d) notFound();

  const day = await loadRambamDay(d);
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
            href="/rambam/today"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Rambam
          </a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">{day.gregorian}</span>
        </div>
      </header>

      <RambamDayReader
        gregorian={day.gregorian}
        hebrew={day.hebrew}
        perakim={day.perakim}
        glossary={glossary.terms}
        prevDate={shiftDate(day.gregorian, -1)}
        nextDate={shiftDate(day.gregorian, +1)}
      />
    </main>
  );
}
