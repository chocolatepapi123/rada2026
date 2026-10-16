import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface FullScreenGalleryModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const FullScreenGalleryModal: React.FC<FullScreenGalleryModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title,
  subtitle,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance) {
      // Swiped left -> next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped right -> prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between backdrop-blur-md animate-in fade-in duration-200 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Controls Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white cursor-pointer"
            title="Close Gallery (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            {title && (
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-white/70 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Counter Badge (e.g. 1/6) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-mono font-black text-white border border-white/10">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </div>

      {/* Main Stage with Large Image & Floating Arrows */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Left Arrow Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-lg"
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Center Image */}
        <div className="relative max-h-[75vh] max-w-full flex items-center justify-center">
          <img
            key={currentImg}
            src={currentImg}
            alt={title ? `${title} photo ${currentIndex + 1}` : `Photo ${currentIndex + 1}`}
            className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 animate-in fade-in zoom-in-95 pointer-events-none"
            loading="eager"
          />
        </div>

        {/* Right Arrow Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-lg"
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="w-full max-w-2xl mx-auto px-4 pb-6 pt-2 z-20">
        {images.length > 1 ? (
          <div className="flex items-center justify-center gap-2 overflow-x-auto hide-scrollbar py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  idx === currentIndex
                    ? 'border-[#E0533C] scale-110 shadow-lg'
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-[11px] text-white/50 flex items-center justify-center gap-1.5">
            <Images className="w-3.5 h-3.5" />
            <span>High-definition verified photo</span>
          </div>
        )}
      </div>
    </div>
  );
};
