export default function Home() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/calendar/today",
      desc: "Today's Hebrew date + daily learning schedule",
    },
    {
      method: "GET",
      path: "/api/v1/calendar/:date",
      desc: "Hebrew date + schedule for any date (YYYY-MM-DD)",
    },
    {
      method: "GET",
      path: "/api/v1/chitas/today",
      desc: "Full daily Chitas (Chumash + Tehillim + Tanya)",
    },
    {
      method: "GET",
      path: "/api/v1/chitas/chumash/today",
      desc: "Today's Chumash portion",
    },
    {
      method: "GET",
      path: "/api/v1/chitas/tehillim/today",
      desc: "Today's Tehillim",
    },
    {
      method: "GET",
      path: "/api/v1/chitas/tanya/today",
      desc: "Today's Tanya",
    },
    {
      method: "GET",
      path: "/api/v1/rambam/today",
      desc: "Daily Rambam (3-chapter + 1-chapter cycles)",
    },
    {
      method: "GET",
      path: "/api/v1/texts/:category/:book/:chapter",
      desc: "Browse any text by category, book, and chapter",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg" dir="rtl">
                ת
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">
                Yafutzu Torah
              </h1>
              <p className="text-sm text-stone-500">
                Free Public API for Daily Jewish Learning
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-4xl font-bold text-stone-900 mb-4">
            Chitas & Rambam,
            <br />
            <span className="text-amber-700">everywhere.</span>
          </h2>
          <p className="text-lg text-stone-600 mb-8 max-w-2xl">
            A free, open API for daily Torah learning. Get today&apos;s Chitas
            (Chumash, Tehillim, Tanya) and daily Rambam with a single API call.
            No authentication required.
          </p>

          {/* Quick Example */}
          <div className="bg-stone-900 rounded-xl p-6 mb-6 overflow-x-auto">
            <div className="text-stone-400 text-sm mb-2 font-mono">
              # Get today&apos;s complete Chitas
            </div>
            <code className="text-amber-400 font-mono text-sm">
              curl https://torah.yafutzu.org/api/v1/chitas/today
            </code>
          </div>

          {/* Reader entry points */}
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            <a
              href="/rambam/today"
              className="block bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-xl p-5 transition-colors"
            >
              <div className="text-xs font-mono text-amber-700 uppercase tracking-wide">
                Lettore · Reader
              </div>
              <div className="text-lg font-bold text-stone-900 mt-1">
                📖 Rambam di oggi (3 perakim)
              </div>
              <p className="text-sm text-stone-600 mt-1">
                Daily Rambam reader — Hebrew + Italian translation with
                clickable halachic glossary.
              </p>
            </a>
            <a
              href="/it-demo"
              className="block bg-stone-50 border border-stone-200 hover:border-amber-400 rounded-xl p-5 transition-colors"
            >
              <div className="text-xs font-mono text-stone-500 uppercase tracking-wide">
                Italiano
              </div>
              <div className="text-lg font-bold text-stone-900 mt-1">
                🇮🇹 Capitoli tradotti
              </div>
              <p className="text-sm text-stone-600 mt-1">
                Browse all translated Italian chapters one-by-one with the
                halachic glossary.
              </p>
            </a>
          </div>

          {/* Endpoints */}
          <h3 className="text-2xl font-bold text-stone-900 mb-6">
            API Endpoints
          </h3>
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-stone-200"
              >
                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded font-mono mt-0.5">
                  {ep.method}
                </span>
                <div>
                  <code className="text-sm font-mono text-stone-800">
                    {ep.path}
                  </code>
                  <p className="text-sm text-stone-500 mt-1">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 bg-white rounded-xl border border-stone-200">
              <div className="text-2xl mb-3">&#x1F4D6;</div>
              <h4 className="font-bold text-stone-900 mb-2">Daily Chitas</h4>
              <p className="text-sm text-stone-600">
                Chumash (weekly parsha divided into 7 daily portions), Tehillim
                (by day of Hebrew month), and Tanya (Alter Rebbe&apos;s daily
                division).
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-stone-200">
              <div className="text-2xl mb-3">&#x1F4DA;</div>
              <h4 className="font-bold text-stone-900 mb-2">Daily Rambam</h4>
              <p className="text-sm text-stone-600">
                Both the 3-chapter daily cycle and the 1-chapter daily cycle of
                Mishneh Torah.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-stone-200">
              <div className="text-2xl mb-3">&#x1F310;</div>
              <h4 className="font-bold text-stone-900 mb-2">
                Free & Open
              </h4>
              <p className="text-sm text-stone-600">
                No API key needed. No rate limits. CORS-enabled. Build Torah
                into any website or app.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-stone-500">
          <p>
            Part of the{" "}
            <span className="font-semibold text-stone-700">Yafutzu</span>{" "}
            ecosystem
          </p>
          <p className="mt-1 text-stone-400" dir="rtl">
            יפוצו מעיינותיך חוצה
          </p>
        </div>
      </footer>
    </div>
  );
}
