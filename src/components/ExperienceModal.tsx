import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Star, 
  Car, 
  Share2, 
  ExternalLink, 
  Bookmark, 
  Check, 
  Images, 
  Compass, 
  MessageCircle,
  Tag
} from 'lucide-react';
import { ExperienceItem } from '../types.ts';
import { shareContent } from '../utils/shareUtils.ts';

interface ExperienceModalProps {
  experience: ExperienceItem | null;
  isSaved?: boolean;
  onToggleSave?: (item: ExperienceItem) => void;
  onOpenGallery?: (images: string[], index?: number, title?: string) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ExperienceModal: React.FC<ExperienceModalProps> = ({
  experience,
  isSaved = false,
  onToggleSave,
  onOpenGallery,
  onClose,
  showToast
}) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  if (!experience) return null;

  const allImages = (experience.images && experience.images.length > 0)
    ? experience.images
    : [experience.img];

  const currentHeroImg = allImages[activeImgIndex % allImages.length] || experience.img;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200"
            aria-label="Back"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0 px-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E0533C] block">
              Experience Discovery
            </span>
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
              {experience.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleSave && (
              <button
                onClick={() => onToggleSave(experience)}
                title={isSaved ? 'Remove from Saved' : 'Save Experience'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                  isSaved
                    ? 'bg-[#E0533C] text-white shadow-sm'
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-200 hover:text-[#E0533C]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={() => {
                shareContent({
                  title: `RADA Experience: ${experience.title}`,
                  text: `Check out ${experience.title} (${experience.category}) in ${experience.neighborhood} on RADA Nairobi! Price: ${experience.price}.`,
                  url: window.location.href,
                  onSuccess: showToast,
                  onError: showToast
                });
              }}
              title="Share Experience"
              className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-24">
        {/* Photo Carousel Hero */}
        <div className="space-y-2">
          <div
            onClick={() => onOpenGallery && onOpenGallery(allImages, activeImgIndex, experience.title)}
            className="h-64 rounded-3xl bg-cover bg-center relative shadow-md cursor-pointer group overflow-hidden"
            style={{ backgroundImage: `url('${currentHeroImg}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            
            <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-xl">
              {experience.price}
            </span>

            {experience.duration && (
              <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>{experience.duration}</span>
              </span>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="bg-white/95 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>★ {experience.rating} ({experience.reviewCount || 42} reviews)</span>
              </span>

              <button
                type="button"
                className="bg-black/80 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm"
              >
                <Images className="w-3.5 h-3.5" />
                <span>{activeImgIndex + 1}/{allImages.length} Full View</span>
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
              {allImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`w-14 h-14 rounded-xl bg-cover bg-center shrink-0 cursor-pointer border-2 transition ${
                    idx === activeImgIndex ? 'border-[#E0533C] scale-105' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundImage: `url('${imgUrl}')` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title & Metadata */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {experience.title}
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#E0533C]">
              {experience.category}
            </span>
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>{experience.neighborhood} · {experience.address}</span>
          </p>

          {/* Tags Chips */}
          {experience.tags && experience.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {experience.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-md bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {experience.description && (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
              {experience.description}
            </p>
          )}
        </div>

        {/* What's Included */}
        {experience.included && experience.included.length > 0 && (
          <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#2D6A4F]" />
              <span>What's Included In This Move</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              {experience.included.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E0533C] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ride to Experience */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              showToast(`Opening Uber to ${experience.title}...`);
              window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(experience.address)}`, '_blank');
            }}
            className="py-2.5 bg-black text-white hover:bg-slate-800 font-black rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            <span>Uber to Venue</span>
          </button>
          <button
            onClick={() => {
              showToast(`Opening Bolt to ${experience.title}...`);
              window.open('https://bolt.eu/', '_blank');
            }}
            className="py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            <span>Bolt to Venue</span>
          </button>
        </div>

        {/* Booking CTA Bar */}
        <div className="pt-2 flex gap-2">
          {experience.whatsapp && (
            <a
              href={`https://wa.me/${experience.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi! I'm interested in booking "${experience.title}" via RADA Kenya.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Host</span>
            </a>
          )}
          <a
            href={experience.bookingUrl || `https://wa.me/254700000000`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-1.5"
          >
            <span>Book Experience ({experience.price})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
