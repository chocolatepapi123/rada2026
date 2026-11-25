import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SingleSlideCarouselProps {
  children: React.ReactNode;
  ariaLabel: string;
}

/**
 * Full-width single-card swipe carousel: displays one complete card at a time
 * with smooth native touch/swipe snap transitions and zero slide counters.
 */
export const SingleSlideCarousel: React.FC<SingleSlideCarouselProps> = ({
  children,
  ariaLabel,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const slides = React.Children.toArray(children);

  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    syncScrollState();
    const el = trackRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncScrollState) : null;
    ro?.observe(el);
    window.addEventListener('resize', syncScrollState);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncScrollState);
    };
  }, [slides.length, syncScrollState]);

  const step = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  if (slides.length === 0) return null;

  return (
    <div className="relative group/carousel" role="region" aria-roledescription="carousel" aria-label={ariaLabel}>
      <div
        ref={trackRef}
        onScroll={syncScrollState}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar touch-pan-x"
      >
        {slides.map((child, idx) => (
          <div
            key={(React.isValidElement(child) && child.key != null) ? child.key : idx}
            className="w-full min-w-full shrink-0 snap-center snap-always"
          >
            {child}
          </div>
        ))}
      </div>

      {slides.length > 1 && canPrev && (
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous slide"
          className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1C1A1E]/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 shadow-md items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition hover:scale-105 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {slides.length > 1 && canNext && (
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next slide"
          className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1C1A1E]/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 shadow-md items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition hover:scale-105 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
