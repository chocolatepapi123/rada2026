import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Globe,
  Video,
  Link as LinkIcon,
  Ticket,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  Upload,
  Camera,
  Trash2,
  Plus,
  Users,
  X,
} from 'lucide-react';
import type { Artist, EventItem, TicketTier } from '../types.ts';
import type { ToastOptions } from './Toast.tsx';
import { DynamicLocationSelector } from '../features-parked/merchant-hub/DynamicLocationSelector.tsx';
import { readFilesAsDataUrls, deduplicateAndLimitPhotos } from '../utils/mediaUtils.ts';

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
  { id: 'concerts', label: 'Concerts & Live Festivals', radaCategory: 'concerts' },
  { id: 'nightlife', label: 'Nightlife Club Rave', radaCategory: 'nightlife' },
  { id: 'art', label: 'Art & Cultural Showcase', radaCategory: 'arts' },
  { id: 'cinemas', label: 'Film & Cinema Screening', radaCategory: 'cinemas' },
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
  { match: /karura|muthaiga|gigiri|two rivers|runda|village market/i, lat: -1.233, lng: 36.825 },
  { match: /cbd|kencom|loita|kicc|uhuru/i, lat: -1.2864, lng: 36.8172 },
  { match: /lavington|kileleshwa/i, lat: -1.2784, lng: 36.7745 },
];

function tomorrowYmd(): string {
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

function parseTierPriceValue(priceStr: string): number {
  if (/free/i.test(priceStr)) return 0;
  const digits = priceStr.replace(/[^0-9.]/g, '');
  const num = Number(digits);
  return Number.isFinite(num) && num >= 0 ? num : 0;
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
  // Format + Core Identity
  const [isOnline, setIsOnline] = useState(initialOnline);
  const [eventTitle, setEventTitle] = useState(initialTitle);
  const [eventCategory, setEventCategory] = useState<EventItem['category']>(
    initialOnline ? 'online' : 'concerts'
  );
  const [eventGenre, setEventGenre] = useState('Afrobeats & Amapiano');
  const [host, setHost] = useState(hostName || '');
  const [eventDescription, setEventDescription] = useState('');

  // Date & Schedule
  const [dateYmd, setDateYmd] = useState(tomorrowYmd);
  const [startTime24, setStartTime24] = useState('20:00');
  const [eventTimeRange, setEventTimeRange] = useState('08:00 PM - 04:00 AM');

  // Venue Location OR Online Stream
  const [eventLocation, setEventLocation] = useState('Westlands');
  const [eventExactLocationTag, setEventExactLocationTag] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [platform, setPlatform] = useState('Zoom');
  const [meetingUrl, setMeetingUrl] = useState('');

  // Event Poster & Multi-Image Gallery
  const [eventImg, setEventImg] = useState('');
  const [eventGalleryImgs, setEventGalleryImgs] = useState<string[]>([]);

  // Ticketing Portal & Multi-Tier Passes
  const [eventUrl, setEventUrl] = useState('');
  const [isFreeEvent, setIsFreeEvent] = useState(false);
  const [eventTiers, setEventTiers] = useState<TicketTier[]>([
    { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
    { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
    { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' },
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('KES ');
  const [newTierPerks, setNewTierPerks] = useState('');

  // Performing Artists & DJ Lineup
  const [eventArtists, setEventArtists] = useState<Artist[]>([]);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistRole, setNewArtistRole] = useState('Guest DJ / Performer');

  useEffect(() => {
    if (!open) return;
    setIsOnline(initialOnline);
    setEventTitle(initialTitle || '');
    setEventCategory(initialOnline ? 'online' : 'concerts');
    setEventGenre(initialOnline ? 'Online Session & Live Stream' : 'Afrobeats & Amapiano');
    setHost(hostName || '');
    setEventDescription('');
    setDateYmd(tomorrowYmd());
    setStartTime24('20:00');
    setEventTimeRange('08:00 PM - 04:00 AM');
    setEventLocation('Westlands');
    setEventExactLocationTag('');
    setDressCode('');
    setPlatform('Zoom');
    setMeetingUrl('');
    setEventImg('');
    setEventGalleryImgs([]);
    setEventUrl('');
    setIsFreeEvent(false);
    setEventTiers([
      { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
      { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
      { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' },
    ]);
    setNewTierName('');
    setNewTierPrice('KES ');
    setNewTierPerks('');
    setEventArtists([]);
    setNewArtistName('');
    setNewArtistRole('Guest DJ / Performer');
  }, [open, initialTitle, initialOnline, hostName]);

  if (!open) return null;

  const handleEventPosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setEventImg(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setEventImg(String(reader.result));
          }
        };
        img.onerror = () => setEventImg(String(reader.result));
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEventGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (eventGalleryImgs.length >= 5) {
      showToast?.('Maximum 5 event gallery photos allowed.', { type: 'error' });
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(eventGalleryImgs, dataUrls, 5);

    if (result.exceededLimit) {
      showToast?.('Maximum 5 event gallery photos limit reached.', { type: 'error' });
    }

    setEventGalleryImgs(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveEventGalleryImage = (indexToRemove: number) => {
    setEventGalleryImgs((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = eventTitle.trim();
    if (!cleanTitle) {
      showToast?.('Please enter an event title.', { type: 'error' });
      return;
    }

    if (isOnline && !meetingUrl.trim()) {
      showToast?.('Please enter the meeting or livestream link for your online event.', { type: 'error' });
      return;
    }

    if (!isOnline && !eventLocation.trim()) {
      showToast?.('Please select or enter a venue location.', { type: 'error' });
      return;
    }

    const normalizedMeetingUrl =
      meetingUrl.trim() && !/^https?:\/\//i.test(meetingUrl.trim())
        ? `https://${meetingUrl.trim()}`
        : meetingUrl.trim();
    const normalizedTicketUrl =
      eventUrl.trim() && !/^https?:\/\//i.test(eventUrl.trim())
        ? `https://${eventUrl.trim()}`
        : eventUrl.trim();

    const finalLocation = isOnline
      ? `Online · ${platform}`
      : eventExactLocationTag.trim() && !eventLocation.includes(eventExactLocationTag.trim())
      ? `${eventLocation.trim()} • ${eventExactLocationTag.trim()}`
      : eventLocation.trim();

    let lat = Number.NaN;
    let lng = Number.NaN;
    if (!isOnline) {
      const hint = VENUE_COORDS_HINTS.find((h) => h.match.test(finalLocation));
      lat = hint ? hint.lat : -1.2864;
      lng = hint ? hint.lng : 36.8172;
    }

    const primaryPoster =
      eventImg.trim() ||
      eventGalleryImgs[0] ||
      (isOnline ? COVER_PRESETS[2].url : COVER_PRESETS[0].url);
    const galleryImages =
      eventGalleryImgs.length > 0 ? eventGalleryImgs : [primaryPoster];

    const normalizedTiers: TicketTier[] = isFreeEvent
      ? [
          {
            name: isOnline ? 'Free Online Access' : 'Free Entry',
            price: 'Free',
            priceValue: 0,
            currency: 'KES',
            perks: isOnline ? `Live on ${platform}` : 'Complimentary admission',
            status: 'available',
          },
        ]
      : eventTiers.length > 0
      ? eventTiers.map((t) => ({
          ...t,
          priceValue: t.priceValue ?? parseTierPriceValue(t.price),
          currency: t.currency || 'KES',
          status: t.status || 'available',
        }))
      : [
          {
            name: isOnline ? 'Online Access' : 'General Entry',
            price: 'Free',
            priceValue: 0,
            currency: 'KES',
            status: 'available',
          },
        ];

    const paidValues = normalizedTiers
      .map((t) => t.priceValue ?? parseTierPriceValue(t.price))
      .filter((v) => Number.isFinite(v));
    const priceMin = paidValues.length > 0 ? Math.min(...paidValues) : 0;

    const catMeta = EVENT_CATEGORIES.find((c) => c.id === eventCategory);
    const readableDate = formatReadableDate(dateYmd);
    const displayHours = eventTimeRange.trim() || formatTime12h(startTime24);
    const startAtIso = `${dateYmd}T${startTime24 || '18:00'}:00+03:00`;

    const newEvt: EventItem = {
      id: `user-ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      category: isOnline ? 'online' : eventCategory,
      genre: eventGenre.trim() || (isOnline ? `Online · ${platform}` : catMeta?.label || 'Event'),
      radaCategory: isOnline ? 'online' : catMeta?.radaCategory || eventCategory,
      date: readableDate,
      time: displayHours,
      startAt: startAtIso,
      location: finalLocation,
      address: isOnline ? platform : finalLocation,
      lat,
      lng,
      img: primaryPoster,
      images: galleryImages,
      goingCount: 1,
      url: isOnline ? normalizedTicketUrl || normalizedMeetingUrl : normalizedTicketUrl,
      meetingUrl: isOnline ? normalizedMeetingUrl : undefined,
      platform: isOnline ? platform : undefined,
      isOnline,
      isUserCreated: true,
      createdByUserId: currentUserId,
      host: host.trim() || hostName || 'Community Host',
      dressCode: isOnline ? undefined : dressCode.trim() || undefined,
      description:
        eventDescription.trim() ||
        (isOnline
          ? `Hosted live on ${platform}. Join from anywhere and connect with the RADA community.`
          : `Hosted at ${finalLocation}. Join in and vibe with the RADA community.`),
      artists: eventArtists,
      currency: 'KES',
      priceMin,
      tags: isOnline ? ['online', 'community', platform.toLowerCase()] : ['community'],
      tiers: normalizedTiers,
    };

    onCreateEvent(newEvt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 overflow-y-auto flex flex-col animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Add Event"
    >
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#1C1A1E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                {isOnline ? 'Publish Online Event Listing' : 'Publish Event Listing'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Host: <strong className="text-slate-700 dark:text-slate-300">{host.trim() || hostName || 'Community Host'}</strong> • Live RADA Events Feed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSaveEvent(e as any)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Publish Event</span>
          </button>
        </div>
      </div>

      {/* Main Full-Screen Form Container */}
      <div className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-28">
        <form onSubmit={handleSaveEvent} className="space-y-6">
          {/* Card 1: Event Core Identity */}
          <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                <span>Event Identity &amp; Category</span>
              </h3>
              <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                Live Event Listing
              </span>
            </div>

            {/* In-Person vs Online Event Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#121113]">
              <button
                type="button"
                onClick={() => {
                  setIsOnline(false);
                  if (eventCategory === 'online') setEventCategory('concerts');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  !isOnline
                    ? 'bg-white dark:bg-[#1C1A1E] text-purple-600 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>In-Person Event</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOnline(true);
                  setEventCategory('online');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isOnline
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Online / Virtual Event</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder={
                  isOnline
                    ? 'e.g. Sunday Afrohouse Livestream • Founders & Creators AMA'
                    : 'e.g. Sunset Amapiano Jam Vol. 4 • Special Edition'
                }
                className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Event Category
                </label>
                <select
                  value={eventCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value as EventItem['category'];
                    setEventCategory(nextCat);
                    if (nextCat === 'online') setIsOnline(true);
                    else if (isOnline) setIsOnline(false);
                  }}
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Music Genre / Theme Tag
                </label>
                <input
                  type="text"
                  value={eventGenre}
                  onChange={(e) => setEventGenre(e.target.value)}
                  placeholder="e.g. Amapiano & Afro-Tech / Hip-Hop"
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Host / Organizer Name
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Your name, collective, or @handle"
                className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Event Description / Vibe Overview
              </label>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                placeholder="Describe the sound system, headliners, outdoor stages, food vendors, or online session agenda..."
                className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Schedule: Date & Time */}
          <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Date &amp; Schedule</span>
              </h3>
              <span className="text-[11px] font-bold text-purple-600">
                {formatReadableDate(dateYmd)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={dateYmd}
                  onChange={(e) => setDateYmd(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime24}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartTime24(v);
                    setEventTimeRange(formatTime12h(v));
                  }}
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Event Hours Label
                </label>
                <input
                  type="text"
                  value={eventTimeRange}
                  onChange={(e) => setEventTimeRange(e.target.value)}
                  placeholder="e.g. 08:00 PM - 04:00 AM"
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Venue Location & Transit Directions OR Online Platform + URL */}
          {isOnline ? (
            <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                  <span>Online Stream &amp; Access Link</span>
                </h3>
                <span className="text-[10px] text-purple-600 font-bold">Virtual • Worldwide</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  <span>Streaming / Meeting Platform</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ONLINE_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        platform === p
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#121113] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Join / Livestream URL *</span>
                </label>
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="e.g. https://meet.google.com/... or https://zoom.us/j/..."
                  className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Attendees can join straight from RADA using this link.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>Venue Location &amp; Transit Directions</span>
                </h3>
                <span className="text-[10px] text-purple-600 font-bold">Nairobi • Kiambu • Mombasa Rd</span>
              </div>

              <DynamicLocationSelector
                value={eventLocation}
                onChange={(loc) => setEventLocation(loc)}
                label="Venue Neighborhood / Area Location *"
                placeholder="Search venue estate, Kiambu, Mombasa Rd stages, or type custom..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Specific Stage / Landmark / Gate Directions
                  </label>
                  <input
                    type="text"
                    value={eventExactLocationTag}
                    onChange={(e) => setEventExactLocationTag(e.target.value)}
                    placeholder="e.g. The Courtyard Main Stage, Gate 2, Village Market"
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Helps partygoers navigate bus drops, Uber drop-offs, and venue security gates.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dress Code (optional)
                  </label>
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="e.g. Smart casual, Afro-futuristic, All White"
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card 4: NATIVE FILE UPLOADS: EVENT POSTER & MULTI-IMAGE GALLERY */}
          <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Event Poster &amp; Visual Gallery</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select high-res artwork &amp; venue vibe photos directly from your device (no URL typing required)
                </p>
              </div>
            </div>

            {/* Primary Event Poster / Cover */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Primary Event Poster Artwork *
                </label>
                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                  Main Banner Artwork
                </span>
              </div>

              {eventImg ? (
                <div className="relative rounded-2xl overflow-hidden shadow-sm bg-slate-900 group">
                  <div className="h-64 sm:h-72 w-full relative">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={eventImg}
                      alt="Event Poster Preview"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active Cover Poster</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <label
                        htmlFor="event-poster-file-input-replace"
                        className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg cursor-pointer transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                        <span>Change Poster</span>
                      </label>
                      <input
                        id="event-poster-file-input-replace"
                        type="file"
                        accept="image/*"
                        onChange={handleEventPosterFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setEventImg('')}
                        className="px-3 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="event-poster-file-input-empty"
                  className="w-full py-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Upload Event Artwork Poster
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tap to select official flyer or poster from your phone or computer
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 mt-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Poster File</span>
                  </span>
                  <input
                    id="event-poster-file-input-empty"
                    type="file"
                    accept="image/*"
                    onChange={handleEventPosterFileUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Quick Cover Presets (optional shortcut if user doesn't have an image handy) */}
              {!eventImg && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Or pick a quick cover vibe
                  </span>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {COVER_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEventImg(preset.url)}
                        className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 hover:border-purple-600 cursor-pointer transition group"
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GALLERY OF MULTIPLE ADDITIONAL EVENT PHOTOS */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Event Atmosphere &amp; Stage Gallery ({eventGalleryImgs.length}/5)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    {eventGalleryImgs.length >= 5
                      ? 'Maximum 5 photos reached (clean gallery limit)'
                      : 'Add stage production, DJ decks, past crowd vibes, or VIP deck photos (max 5)'}
                  </p>
                </div>

                {eventGalleryImgs.length < 5 && (
                  <label
                    htmlFor="event-gallery-file-input"
                    className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                  </label>
                )}
                <input
                  id="event-gallery-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEventGalleryFileUpload}
                  className="hidden"
                />
              </div>

              {eventGalleryImgs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {eventGalleryImgs.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-2xl overflow-hidden aspect-square shadow-sm bg-slate-900"
                    >
                      <img
                        src={imgUrl}
                        alt={`Event photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />

                      {/* Quick 'X' photo removal button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEventGalleryImage(idx);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center transition cursor-pointer z-10 shadow-md"
                        title="Remove photo"
                        aria-label={`Remove event photo ${idx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setEventImg(imgUrl)}
                          className="px-2.5 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-black hover:bg-slate-100 transition cursor-pointer"
                        >
                          Set as Poster
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEventGalleryImage(idx)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                      {eventImg === imgUrl && (
                        <div className="absolute top-2 left-2 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase">
                          Poster
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add More Photos Tile (only if < 5) */}
                  {eventGalleryImgs.length < 5 && (
                    <label
                      htmlFor="event-gallery-file-input-grid"
                      className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-1.5 p-3 aspect-square cursor-pointer transition text-center group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        Add More
                      </span>
                      <input
                        id="event-gallery-file-input-grid"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEventGalleryFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="event-gallery-file-input-empty"
                  className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      No additional vibe photos added yet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload multiple crowd or stage images to hype up partygoers
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">
                    Choose Photos
                  </span>
                  <input
                    id="event-gallery-file-input-empty"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEventGalleryFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Card 5: Ticketing Portal & Multi-Tier Passes */}
          <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-purple-600" />
                <span>Official Primary Ticketing &amp; Passes</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFreeEvent((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer ${
                  isFreeEvent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-[#121113] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isFreeEvent ? 'Free Entry Enabled' : 'Paid Tiers Active'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isOnline ? 'External Ticketing / Registration Link (optional)' : 'Official Primary Ticketing Portal Link (optional)'}
              </label>
              <input
                type="url"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                placeholder="e.g. https://hustlesasa.com/your-event OR https://kenyabuzz.com/events"
                className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Direct primary checkout links only (no affiliate codes or redirects).
              </p>
            </div>

            {/* Ticket Tiers */}
            {!isFreeEvent && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Admission Tiers ({eventTiers.length})
                </label>
                <div className="space-y-2">
                  {eventTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {tier.name}
                        </span>
                        <span className="text-[11px] text-purple-600 font-black ml-2">
                          {tier.price}
                        </span>
                        {tier.perks && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{tier.perks}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEventTiers((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Tier Mini-Form */}
                <div className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Add Pass Tier
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Tier (e.g. VIP Pass)"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                      className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Price (e.g. KES 3,500)"
                      value={newTierPrice}
                      onChange={(e) => setNewTierPrice(e.target.value)}
                      className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Perks (e.g. Welcome cocktail)"
                      value={newTierPerks}
                      onChange={(e) => setNewTierPerks(e.target.value)}
                      className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTierName.trim()) return;
                      const raw = newTierPrice.trim();
                      const price =
                        !raw || /^free$/i.test(raw)
                          ? 'Free'
                          : /^kes/i.test(raw)
                          ? raw
                          : `KES ${raw}`;
                      setEventTiers((prev) => [
                        ...prev,
                        {
                          name: newTierName.trim(),
                          price,
                          perks: newTierPerks.trim() || 'Standard entry',
                        },
                      ]);
                      setNewTierName('');
                      setNewTierPrice('KES ');
                      setNewTierPerks('');
                    }}
                    className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 6: Headliner / Performing Artists & DJ Lineup */}
          <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Performing Artists &amp; DJ Lineup ({eventArtists.length})</span>
              </h3>
            </div>

            {eventArtists.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {eventArtists.map((a, idx) => (
                  <div
                    key={idx}
                    className="bg-[#FBFBF9] dark:bg-[#121113] p-2.5 rounded-2xl shadow-sm shrink-0 flex items-center gap-2.5"
                  >
                    <img
                      loading="lazy"
                      decoding="async"
                      src={a.img}
                      alt={a.name}
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <span className="font-extrabold text-xs block">{a.name}</span>
                      <span className="text-[10px] text-slate-400 block">{a.role}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEventArtists((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                placeholder="Artist / Headliner DJ / Speaker Name"
                className="flex-1 p-3 bg-slate-100 dark:bg-[#121113] rounded-xl text-xs focus:outline-none"
              />
              <input
                type="text"
                value={newArtistRole}
                onChange={(e) => setNewArtistRole(e.target.value)}
                placeholder="Role (e.g. Special Guest DJ)"
                className="sm:w-48 p-3 bg-slate-100 dark:bg-[#121113] rounded-xl text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newArtistName.trim()) return;
                  setEventArtists((prev) => [
                    ...prev,
                    {
                      name: newArtistName.trim(),
                      role: newArtistRole.trim() || 'Performer',
                      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
                    },
                  ]);
                  setNewArtistName('');
                }}
                className="px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Artist</span>
              </button>
            </div>
          </div>

          {/* Bottom Submit Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm rounded-2xl transition cursor-pointer text-center order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-purple-500/20 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isOnline ? 'Publish Online Event to RADA' : 'Publish Event to RADA'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
