import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Video,
  Link as LinkIcon,
  Ticket,
  Sparkles,
  Image as ImageIcon,
  Check,
  Upload,
} from 'lucide-react';
import type { EventItem } from '../types.ts';
import type { ToastOptions } from './Toast.tsx';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreateEvent: (event: EventItem) => void;
  initialTitle?: string;
  initialOnline?: boolean;
  hostName?: string;
  currentUserId?: string;
  showToast?: (msg: string, options?: ToastOptions) => void;
}

const ONLINE_PLATFORMS = [
  'Zoom',
  'Google Meet',
  'YouTube Live',
  'Twitch',
  'Instagram Live',
  'Discord Stage',
  'Microsoft Teams',
  'Other Stream Link',
];

const EVENT_CATEGORIES: {
  id: EventItem['category'];
  label: string;
  radaCategory: string;
}[] = [
  { id: 'concerts', label: 'Live Music & Concerts', radaCategory: 'concerts' },
  { id: 'nightlife', label: 'Parties & Nightlife', radaCategory: 'nightlife' },
  { id: 'art', label: 'Arts, Culture & Comedy', radaCategory: 'arts' },
  { id: 'tech', label: 'Tech, Startups & Gaming', radaCategory: 'business' },
  { id: 'sports', label: 'Sports & Fitness', radaCategory: 'sports' },
  { id: 'online', label: 'Online / Virtual', radaCategory: 'online' },
];

const COVER_PRESETS: { label: string; url: string }[] = [
  {
    label: 'Sunset Vibes',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop',
  },
  {
    label: 'Rooftop Night',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop',
  },
  {
    label: 'Studio / Online',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&auto=format&fit=crop',
  },
  {
    label: 'Creative Workshop',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop',
  },
  {
    label: 'Crowd Energy',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&auto=format&fit=crop',
  },
];

const VENUE_COORDS_HINTS: { match: RegExp; lat: number; lng: number }[] = [
  { match: /westlands|alchemist|sarit/i, lat: -1.2647, lng: 36.8027 },
  { match: /kilimani|yaya|ngong road|ihub/i, lat: -1.2921, lng: 36.7875 },
  { match: /karen/i, lat: -1.319, lng: 36.711 },
  { match: /karura|muthaiga|gigiri|two rivers|runda/i, lat: -1.233, lng: 36.825 },
  { match: /cbd|kencom|loita|kicc|uhuru/i, lat: -1.2864, lng: 36.8172 },
  { match: /lavington|kileleshwa/i, lat: -1.2784, lng: 36.7745 },
];

function todayYmd(): string {
  const d = new Date(Date.now() + 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatReadableDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  if (isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${mStr || '00'} ${period}`;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  open,
  onClose,
  onCreateEvent,
  initialTitle = '',
  initialOnline = false,
  hostName = '',
  currentUserId,
  showToast,
}) => {
  const [isOnline, setIsOnline] = useState(initialOnline);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<EventItem['category']>(initialOnline ? 'online' : 'concerts');
  const [dateYmd, setDateYmd] = useState(todayYmd);
  const [time24, setTime24] = useState('19:00');
  const [venue, setVenue] = useState('');
  const [platform, setPlatform] = useState('Zoom');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [priceKes, setPriceKes] = useState('500');
  const [host, setHost] = useState(hostName || '');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(COVER_PRESETS[0].url);
  const [dressCode, setDressCode] = useState('');

  useEffect(() => {
    if (!open) return;
    setIsOnline(initialOnline);
    if (initialTitle) setTitle(initialTitle);
    if (initialOnline) {
      setCategory('online');
      setCoverUrl(COVER_PRESETS[2].url);
    }
    if (hostName && !host) setHost(hostName);
  }, [open, initialTitle, initialOnline, hostName, host]);

  if (!open) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setCoverUrl(canvas.toDataURL('image/jpeg', 0.78));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast?.('Please enter an event title.', { type: 'error' });
      return;
    }

    if (isOnline && !meetingUrl.trim()) {
      showToast?.('Please enter the meeting or stream link for your online event.', { type: 'error' });
      return;
    }

    if (!isOnline && !venue.trim()) {
      showToast?.('Please enter a venue or location in Nairobi.', { type: 'error' });
      return;
    }

    const numericPrice = isFree ? 0 : Math.max(0, Number(priceKes) || 0);
    const startAtIso = `${dateYmd}T${time24 || '18:00'}:00+03:00`;
    const normalizedMeetingUrl =
      meetingUrl.trim() && !/^https?:\/\//i.test(meetingUrl.trim())
        ? `https://${meetingUrl.trim()}`
        : meetingUrl.trim();
    const normalizedExternalUrl =
      externalUrl.trim() && !/^https?:\/\//i.test(externalUrl.trim())
        ? `https://${externalUrl.trim()}`
        : externalUrl.trim();

    let lat = Number.NaN;
    let lng = Number.NaN;
    if (!isOnline) {
      const hint = VENUE_COORDS_HINTS.find((h) => h.match.test(venue));
      lat = hint ? hint.lat : -1.2864;
      lng = hint ? hint.lng : 36.8172;
    }

    const catMeta = EVENT_CATEGORIES.find((c) => c.id === category);
    const locationLabel = isOnline ? `Online · ${platform}` : venue.trim();
    const eventId = `user-ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const created: EventItem = {
      id: eventId,
      title: cleanTitle,
      category: isOnline ? 'online' : category,
      genre: isOnline ? `Online · ${platform}` : catMeta?.label.split('&')[0].trim() || 'Event',
      radaCategory: isOnline ? 'online' : catMeta?.radaCategory || category,
      date: formatReadableDate(dateYmd),
      time: formatTime12h(time24),
      startAt: startAtIso,
      location: locationLabel,
      address: isOnline ? platform : venue.trim(),
      lat,
      lng,
      img: coverUrl.trim() || COVER_PRESETS[0].url,
      goingCount: 1,
      url: isOnline ? normalizedMeetingUrl : normalizedExternalUrl || '',
      meetingUrl: isOnline ? normalizedMeetingUrl : undefined,
      platform: isOnline ? platform : undefined,
      isOnline,
      isUserCreated: true,
      createdByUserId: currentUserId,
      host: host.trim() || 'Community Host',
      dressCode: isOnline ? undefined : dressCode.trim() || undefined,
      description:
        description.trim() ||
        (isOnline
          ? `Hosted live on ${platform}. Join from anywhere and connect with the RADA community.`
          : `Hosted at ${venue.trim()}. Join in and vibe with the RADA community.`),
      artists: [],
      currency: 'KES',
      priceMin: numericPrice,
      tags: isOnline ? ['online', 'community', platform.toLowerCase()] : ['community'],
      tiers: [
        {
          name: isOnline ? 'Online Access' : 'General Entry',
          price: numericPrice === 0 ? 'Free' : `KES ${numericPrice.toLocaleString()}`,
          priceValue: numericPrice,
          currency: 'KES',
          status: 'available',
        },
      ],
    };

    onCreateEvent(created);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-white dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#E0533C]/12 text-[#E0533C] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-tight">Host or Add an Event</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">In-person around Nairobi or online anywhere</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Format switch: In-Person vs Online */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOnline(false);
                if (category === 'online') setCategory('concerts');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                !isOnline
                  ? 'bg-white dark:bg-slate-900 text-[#E0533C] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>In-Person</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOnline(true);
                setCategory('online');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isOnline
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Online Event</span>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isOnline ? 'e.g., Sunday Afrohouse Livestream or Founders AMA' : 'e.g., Kilimani Sunset Acoustic Session'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:border-[#E0533C]"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Vibe / Category</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.id);
                      if (c.id === 'online') setIsOnline(true);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                      active
                        ? 'bg-[#E0533C] text-white border-[#E0533C]'
                        : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#E0533C]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#E0533C]" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                value={time24}
                onChange={(e) => setTime24(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
              />
            </div>
          </div>

          {/* Venue OR Online Platform + Meeting URL */}
          {isOnline ? (
            <div className="p-3.5 rounded-2xl bg-sky-500/8 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" />
                  <span>Streaming / Meeting Platform</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ONLINE_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        platform === p
                          ? 'bg-sky-600 text-white'
                          : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Join / Livestream URL *</span>
                </label>
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-sky-200 dark:border-sky-800 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#E0533C]" />
                  <span>Venue &amp; Neighborhood *</span>
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g., The Alchemist, Westlands or Karura Forest"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#E0533C]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Dress Code (optional)</label>
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Smart casual"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#E0533C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ticket Link (optional)</label>
                  <input
                    type="text"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#E0533C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Ticket className="w-3 h-3 text-[#2D6A4F]" />
              <span>Entry / Ticket Price</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFree(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black border cursor-pointer transition ${
                  isFree
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                Free Event
              </button>
              <button
                type="button"
                onClick={() => setIsFree(false)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black border cursor-pointer transition ${
                  !isFree
                    ? 'bg-[#E0533C] text-white border-[#E0533C]'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                Paid (KES)
              </button>
              {!isFree && (
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={priceKes}
                  onChange={(e) => setPriceKes(e.target.value)}
                  placeholder="500"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                />
              )}
            </div>
          </div>

          {/* Host + Description */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Host / Organizer Name</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Your name or @handle"
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#E0533C]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Description &amp; Vibe</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should people expect? Lineup, agenda, or special notes..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:border-[#E0533C] resize-none"
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-[#E0533C]" />
                <span>Event Poster</span>
              </label>
              <label className="text-[11px] font-bold text-[#E0533C] cursor-pointer flex items-center gap-1 hover:underline">
                <Upload className="w-3 h-3" />
                <span>Upload photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {COVER_PRESETS.map((preset) => {
                const selected = coverUrl === preset.url;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCoverUrl(preset.url)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition ${
                      selected ? 'border-[#E0533C] ring-2 ring-[#E0533C]/30' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E0533C] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 pb-1">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white font-black text-sm shadow-lg shadow-[#E0533C]/25 transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {isOnline ? <Globe className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{isOnline ? 'Publish Online Event' : 'Publish Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
