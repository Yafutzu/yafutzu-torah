"use client";

/**
 * TorahBreadcrumb — single-line wayfinding breadcrumb for every Torah text
 * reader (Next.js / yafutzu-torah port of the Yafutzu social-app component).
 *
 * Per the permanent design rule (memory: feedback_torah_text_breadcrumb_rule.md):
 *   - Top of page, above H1.
 *   - Single line, subtle gray → gold-deep on hover.
 *   - Last segment dimmed and unlinked.
 *   - Mobile collapses middle to `…` chip when trail.length > 4.
 *   - Always emits BreadcrumbList JSON-LD.
 */
import { useEffect, useMemo, useState } from "react";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface Props {
  trail: BreadcrumbSegment[];
}

const ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://torah.yafutzu.org";

function emitJsonLd(trail: BreadcrumbSegment[]) {
  const id = "yf-breadcrumb-jsonld";
  const items = trail.map((seg, i) => {
    const item: Record<string, unknown> = {
      "@type": "ListItem",
      position: i + 1,
      name: seg.label,
    };
    if (seg.href) item.item = `${ORIGIN}${seg.href}`;
    return item;
  });
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };

  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function TorahBreadcrumb({ trail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const trailKey = useMemo(() => JSON.stringify(trail), [trail]);

  useEffect(() => {
    if (!trail || trail.length === 0) return;
    emitJsonLd(trail);
    return () => {
      const el = document.getElementById("yf-breadcrumb-jsonld");
      if (el) el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailKey]);

  if (!trail || trail.length === 0) return null;

  const last = trail.length - 1;
  const tooLong = trail.length > 4;

  const Sep = () => (
    <span className="select-none text-stone-400 mx-0.5">›</span>
  );

  const renderSeg = (seg: BreadcrumbSegment, i: number, isLast: boolean) => {
    const content = (
      <span className="inline-flex items-center gap-1">
        {i === 0 && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3 h-3 opacity-60"
            aria-hidden="true"
          >
            <path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1z" />
          </svg>
        )}
        {seg.label}
      </span>
    );
    if (isLast || !seg.href) {
      return (
        <span
          key={i}
          className="text-stone-400"
          aria-current={isLast ? "page" : undefined}
        >
          {content}
        </span>
      );
    }
    return (
      <a
        key={i}
        href={seg.href}
        className="text-stone-600 hover:text-amber-700 border-b border-dotted border-transparent hover:border-amber-500 transition-colors"
      >
        {content}
      </a>
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap gap-x-1 gap-y-0.5 text-[12px] leading-tight text-stone-500 mb-3"
    >
      {/* Desktop: full trail */}
      <div className="hidden sm:flex items-center flex-wrap gap-x-1">
        {trail.map((seg, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <Sep />}
            {renderSeg(seg, i, i === last)}
          </span>
        ))}
      </div>

      {/* Mobile: collapse middle when long */}
      <div className="flex sm:hidden items-center flex-wrap gap-x-1">
        {tooLong && !expanded ? (
          <>
            {renderSeg(trail[0], 0, false)}
            <Sep />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-1.5 py-px rounded bg-amber-50 text-amber-700 border border-stone-200 text-[11px] font-bold"
              aria-label={`Show ${trail.length - 2} more`}
            >
              …
            </button>
            <Sep />
            {renderSeg(trail[last - 1], last - 1, false)}
            <Sep />
            {renderSeg(trail[last], last, true)}
          </>
        ) : (
          trail.map((seg, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <Sep />}
              {renderSeg(seg, i, i === last)}
            </span>
          ))
        )}
      </div>
    </nav>
  );
}
