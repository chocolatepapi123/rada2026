import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Car, 
  Images,
  Tag
} from 'lucide-react';
import { ExperienceItem } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { shareContent } from '../utils/shareUtils.ts';

interface ExperienceDetailModalProps {
  experience: ExperienceItem | null;
  isSaved?: boolean;
  onToggleSave?: (exp: ExperienceItem) => void;
  onClose: () => void;
  onOpenGallery?: (images: string[], index?: number, title?: string, subtitle?: string) => void;
  showToast: (msg: string) => void;
}

export const ExperienceDetailModal: React.FC<ExperienceDetailModalProps> = ({
  experience,
  isSaved = false,
  onToggleSave,
  onClose,
  onOpenGallery,
  showToast
}) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  if (!experience) return null;

  const allImages = experience.images && experience.images.length > 0
    ? experience.images
    : [experience.img];

  const currentHeroImg = allImages[activeImgIndex % allImages.length] || experience.img;

  const handleShare = () => {
    shareContent({
      title: `RADA Experience: ${experience.title}`,
      text: `Check out ${experience.title} in ${experience.neighborhood} on RADA Nairobi! Price: ${experience.price}, Rating: ★${experience.rating}.`,
      url: window.location.href,
      onSuccess: showToast,
      onError: showToast
    });
  };

  const handleBooking = () => {
    const url = experience.bookingUrl || (experience.whatsapp ? `https://wa.me/${experience.whatsapp.replace(/[^0-9]/g, '')}` : null);
    if (url) {
      window.open(url, '_blank');
      showToast(`Redirecting to official booking for ${experience.title}...`);
    } else {
      showToast('Booking details currently being updated by merchant.');
    }
  };

  const handleWhatsAppInquiry = () => {
    const wa = experience.whatsapp || '+254700000000';
    const text = encodeURIComponent(`Hi! I want to book the experience "${experience.title}" via RADA Nairobi. What dates are available?`);
    window.open(`https://wa.me/${wa.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">
            Nairobi Experience Hub
          </h3>
          <div className="flex items-center gap-1.5">
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(experience)}
                className={`w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center transition ${
                  isSaved ? 'text-[#E0533C]' : 'text-slate-700 dark:text-slate-200 hover:text-[#E0533C]'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Experience'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#E0533C]' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition"
              title="Share Experience"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-24">
        {/* Photo Hero with Tap to Full-Screen Gallery */}
        <div className="space-y-2">
          <div
            onClick={() => {
              if (onOpenGallery) {
                onOpenGallery(allImages, activeImgIndex, experience.title, experience.neighborhood);
              }
            }}
            className="h-64 rounded-3xl bg-cover bg-center relative shadow-md transition-all duration-300 cursor-pointer overflow-hidden group"
            style={{ backgroundImage: `url('${currentHeroImg}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/70 transition" />

            <span className="absolute top-3 left-3 bg-[#2D6A4F] text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wide shadow-md">
              {experience.category}
            </span>

            <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-xl shadow-md">
              {experience.price}
            </span>

            <span className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{experience.rating} ({experience.reviewCount || 48} reviews)</span>
            </span>

            {/* Tap to Full Screen Gallery Button */}
            {onOpenGallery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGallery(allImages, activeImgIndex, experience.title, experience.neighborhood);
                }}
                className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md backdrop-blur-md transition"
              >
                <Images className="w-3.5 h-3.5" />
                <span>{activeImgIndex + 1}/{allImages.length} Gallery</span>
              </button>
            )}
          </div>

          {/* Thumbnails row if multiple images */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
              {allImages.map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImgIndex(i)}
                  className={`w-14 h-14 rounded-xl bg-cover bg-center shrink-0 cursor-pointer border-2 transition ${
                    i === activeImgIndex ? 'border-[#2D6A4F] scale-105' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundImage: `url('${imgUrl}')` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title, Category & Location */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
              {experience.title}
            </h1>
            {experience.businessId && (
              <BusinessBadge businessId={experience.businessId} category="hospitality" size="xs" />
            )}
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>{experience.address || `${experience.neighborhood}, Nairobi`}</span>
          </p>

          {experience.duration && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Duration: {experience.duration}</span>
            </p>
          )}

          {/* Tags */}
          {experience.tags && experience.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {experience.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-lg bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] font-bold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons: Uber & Bolt */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              showToast(`Opening Uber to ${experience.title}...`);
              window.open(
                `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(experience.address || experience.neighborhood)}`,
                '_blank'
              );
            }}
            className="py-2.5 bg-black text-white hover:bg-slate-800 font-black rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            <span>Uber There</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast(`Opening Bolt to ${experience.title}...`);
              window.open(
                `https://bolt.eu/`,
                '_blank'
              );
            }}
            className="py-2.5 bg-[#34D186] text-black hover:bg-emerald-400 font-black rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            <span>Bolt There</span>
          </button>
        </div>

        {/* Description */}
        {experience.description && (
          <div className="p-4 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">
              About This Experience
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {experience.description}
            </p>
          </div>
        )}

        {/* What's Included */}
        {experience.included && experience.included.length > 0 && (
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl space-y-2.5">
            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>What's Included</span>
            </h3>
            <div className="space-y-1.5">
              {experience.included.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Buttons Bar */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleBooking}
            className="w-full py-3.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Book Experience Now ({experience.price})</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleWhatsAppInquiry}
            className="w-full py-3 bg-[#25D366] hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat / Inquire via WhatsApp Concierge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
