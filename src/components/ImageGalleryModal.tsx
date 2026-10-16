import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ImageGalleryModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title,
  subtitle,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, (images.length || 1) - 1)));
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex, images.length]);

  // Keyboard navigation (Arrow keys and Escape)
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
  }, [isOpen, images.length]);

  if (!isOpen || !images || images.length === 0) return null;

  const validImages = images.filter(Boolean);
  const total = validImages.length;
  const currentImg = validImages[currentIndex % total] || validImages[0];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % total);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (diff > minSwipeDistance) {
      handleNext();
    } else if (diff < -minSwipeDistance) {
      handlePrev();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 z-20">
        <div className="min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-[#E0533C] uppercase">
              RADA Gallery
            </span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-white/80 font-mono text-xs tabular-nums">
              {currentIndex + 1} / {total}
            </span>
          </div>
          {title && (
            <h4 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-[11px] text-white/60 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition focus:outline-none shrink-0"
          aria-label="Close full-screen gallery"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
        {/* Navigation Buttons */}
        {total > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center shadow-lg transition active:scale-95"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center shadow-lg transition active:scale-95"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Current Image */}
        <div className="w-full h-full flex items-center justify-center">
          <img
            key={currentImg}
            src={currentImg}
            alt={title || `Photo ${currentIndex + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-200"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
            }}
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {total > 1 && (
        <div className="p-3 bg-black/60 border-t border-white/10 flex items-center justify-center z-20">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar max-w-md py-1">
            {validImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border-2 transition ${
                  idx === currentIndex 
                    ? 'border-[#E0533C] scale-105 shadow-md' 
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundImage: `url('${img}')` }}
                aria-label={`Jump to photo ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
