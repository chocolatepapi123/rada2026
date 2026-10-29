import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, X, Film, MapPin, Ticket, Clapperboard, Clock, ExternalLink, PlayCircle, CalendarDays,
} from 'lucide-react';
import { CinemaMovie, CinemaShowtime } from '../types.ts';
import { distanceKm, LatLng } from '../lib/geo.ts';
import { AREAS, areaOf, providerOf, titleKey, PROVIDERS } from '../lib/cinemaProviders.ts';

interface CinemaExplorerProps {
  movies: CinemaMovie[];
  /** Called when the user taps a showtime / booking button. `bookingUrl`, `locationName` and `date` are set to the chosen option. */
  onBookMovie?: (movie: CinemaMovie) => void;
  userCoords?: LatLng | null;
}

const GENRE_FILTERS = ['All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance'];
const FORMAT_FILTERS = ['All', '2D', '3D', 'IMAX'];
const PAGE_SIZE = 16;
const NAIROBI_CENTRE: LatLng = { lat: -1.2864, lng: 36.8172 };

// ───────────────────────── helpers ─────────────────────────
const localISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmt12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const fmtRuntime = (min?: number) => (min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : '');

const fmtShortDate = (iso?: string) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

const dateParts = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const today = localISO();
  const tomorrow = localISO(new Date(Date.now() + 864e5));
  return {
    dow: iso === today ? 'Today' : iso === tomorrow ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
    dom: d.getDate(),
    mon: d.toLocaleDateString('en-GB', { month: 'short' }),
    long: iso === today ? 'today' : iso === tomorrow ? 'tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
  };
};

const entryVenueLabels = (m: CinemaMovie): string[] => {
  const set = new Set<string>();
  m.venues?.forEach(v => set.add(v.venue));
  m.showtimes?.forEach(s => set.add(s.venue));
  if (!set.size) {
    (m.location || m.locationName || '').split(',').map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
  }
  return [...set];
};

// ───────────────────────── grouping (one film = one card, across providers) ─────────────────────────
interface MovieGroup {
  key: string;
  title: string;
  img: string;
  synopsis?: string;
  genre?: string;
  rating?: string;
  runtimeMin?: number;
  trailerUrl?: string;
  language?: string;
  formats: string[];
  entries: CinemaMovie[];
  providerIds: string[];
  venueLabels: string[];
  areaIds: Set<string>;
  coords: LatLng[];
  comingSoon: boolean;
  releaseDate?: string;
  next?: { date: string; time: string | null };
  dates: string[];
}

function buildGroups(movies: CinemaMovie[]): MovieGroup[] {
  const buckets = new Map<string, CinemaMovie[]>();
  for (const m of movies) {
    const k = titleKey(m.title) || String(m.id);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(m);
  }
  const today = localISO();
  const groups: MovieGroup[] = [];

  for (const [key, entries] of buckets) {
    const first = <K extends keyof CinemaMovie>(f: K) => entries.map(e => e[f]).find(Boolean) as CinemaMovie[K] | undefined;
    const title = [...entries].sort((a, b) => a.title.length - b.title.length)[0].title;
    const venueLabels = [...new Set(entries.flatMap(entryVenueLabels))];
    const areaIds = new Set<string>();
    const coords: LatLng[] = [];
    venueLabels.forEach(v => {
      const a = areaOf(v);
      if (a) { areaIds.add(a.id); coords.push(a.coords); }
    });
    const allShows = entries.flatMap(e => e.showtimes ?? []).filter(s => s.date >= today);
    allShows.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
    const upcomingNow = allShows.find(s => !s.startsAt || new Date(s.startsAt).getTime() > Date.now());
    const formats = [...new Set([
      ...entries.map(e => e.format),
      ...allShows.map(s => s.format || ''),
    ].filter(f => ['2D', '3D', 'IMAX'].includes(f)))];

    groups.push({
      key, title,
      img: (first('img') as string) || '',
      synopsis: first('synopsis'),
      genre: first('genre'),
      rating: first('rating'),
      runtimeMin: first('runtimeMin'),
      trailerUrl: first('trailerUrl'),
      language: first('language'),
      formats: formats.length ? formats : ['2D'],
      entries,
      providerIds: [...new Set(entries.map(e => e.provider || 'other'))],
      venueLabels, areaIds, coords,
      comingSoon: entries.every(e => e.status === 'coming_soon'),
      releaseDate: entries.map(e => e.date).filter(Boolean).sort()[0],
      next: upcomingNow ? { date: upcomingNow.date, time: upcomingNow.time } : undefined,
      dates: [...new Set(allShows.map(s => s.date))].sort(),
    });
  }
  return groups;
}

// ───────────────────────── small UI pieces ─────────────────────────
const Poster: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 ${className}`}>
        <Film className="w-8 h-8 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
};

const ProviderDot: React.FC<{ id: string }> = ({ id }) => {
  const p = providerOf(id);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"
      style={{ backgroundColor: p.color, color: p.textColor }}
    >
      {p.short}
    </span>
  );
};

const ShowPill: React.FC<{ s: CinemaShowtime; accent: string; onClick: () => void }> = ({ s, accent, onClick }) => {
  const past = s.startsAt ? new Date(s.startsAt).getTime() < Date.now() : false;
  const sub = [s.priceKes ? `KSh ${s.priceKes.toLocaleString()}` : '', s.format || ''].filter(Boolean).join(' · ');
  return (
    <button
      type="button" disabled={past} onClick={onClick}
      className={`flex flex-col items-center min-w-[78px] px-2.5 py-1.5 rounded-xl border-2 text-center transition cursor-pointer ${
        past ? 'opacity-40 cursor-not-allowed line-through' : 'hover:text-white'
      }`}
      style={{ borderColor: accent, color: undefined }}
      onMouseEnter={e => { if (!past) { e.currentTarget.style.backgroundColor = accent; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}
    >
      <span className="text-[13px] font-black leading-tight">{s.time ? fmt12(s.time) : 'See times'}</span>
      {sub && <span className="text-[9px] font-bold opacity-70 leading-tight mt-0.5">{sub}</span>}
    </button>
  );
};

// ───────────────────────── detail sheet ─────────────────────────
interface SheetProps {
  group: MovieGroup;
  onClose: () => void;
  onBook: (entry: CinemaMovie, url: string, venue?: string, date?: string) => void;
}

const MovieSheet: React.FC<SheetProps> = ({ group, onClose, onBook }) => {
  const [date, setDate] = useState<string>(group.dates[0] ?? '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const meta = [group.rating && `Rated ${group.rating}`, fmtRuntime(group.runtimeMin), group.genre, group.language].filter(Boolean) as string[];
  const hasDates = group.dates.length > 0;
  const dp = date ? dateParts(date) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={group.title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#141216] rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* grab handle + close */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-3 pb-2 bg-white/95 dark:bg-[#141216]/95 backdrop-blur-sm">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1.5">
            {group.comingSoon ? 'Coming soon' : 'Showtimes & tickets'}
          </span>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-6 space-y-5">
          {/* hero */}
          <div className="flex gap-3.5">
            <Poster src={group.img} alt={group.title} className="w-28 h-40 rounded-2xl shrink-0 shadow-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-black text-lg leading-tight text-slate-900 dark:text-slate-50">{group.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                {group.formats.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-black">{f}</span>
                ))}
                {group.providerIds.map(p => <ProviderDot key={p} id={p} />)}
              </div>
              {meta.length > 0 && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{meta.join(' · ')}</p>}
              {group.comingSoon && group.releaseDate && (
                <p className="text-[12px] font-extrabold text-[#2D6A4F]">Opens {fmtShortDate(group.releaseDate)}</p>
              )}
              {group.trailerUrl && (
                <a href={group.trailerUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E0533C] hover:underline">
                  <PlayCircle className="w-4 h-4" /> Watch trailer
                </a>
              )}
            </div>
          </div>

          {group.synopsis && (
            <div>
              <p className={`text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 ${expanded ? '' : 'line-clamp-4'}`}>{group.synopsis}</p>
              {group.synopsis.length > 220 && (
                <button type="button" onClick={() => setExpanded(v => !v)} className="mt-1 text-[11px] font-bold text-[#2D6A4F] cursor-pointer">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* date strip */}
          {hasDates && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <CalendarDays className="w-3.5 h-3.5" /> Pick a day
              </div>
              <div className="-mx-4 px-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {group.dates.slice(0, 14).map(d => {
                  const p = dateParts(d);
                  const on = d === date;
                  return (
                    <button key={d} type="button" onClick={() => setDate(d)}
                      className={`shrink-0 w-14 py-2 rounded-2xl text-center border transition cursor-pointer ${
                        on ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-sm'
                           : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}>
                      <div className="text-[9px] font-bold uppercase opacity-80">{p.dow}</div>
                      <div className="text-base font-black leading-none my-0.5">{p.dom}</div>
                      <div className="text-[9px] font-bold uppercase opacity-80">{p.mon}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* one section per ticketing provider */}
          <div className="space-y-4">
            {group.entries.map(entry => {
              const p = providerOf(entry.provider);
              const all = entry.showtimes ?? [];
              const day = all.filter(s => s.date === date);
              const venues = entry.venues ?? [];
              const byVenue = new Map<string, CinemaShowtime[]>();
              day.forEach(s => (byVenue.get(s.venue) ?? byVenue.set(s.venue, []).get(s.venue)!).push(s));
              const soon = entry.status === 'coming_soon';

              return (
                <section key={String(entry.id)} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <header className="flex items-center justify-between gap-2 px-3 py-2" style={{ backgroundColor: p.color, color: p.textColor }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Ticket className="w-4 h-4 shrink-0" />
                      <span className="text-[12px] font-black truncate">
                        {p.label}{entry.format && entry.format !== '2D' ? ` · ${entry.format}` : ''}
                      </span>
                    </div>
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={`Open on ${p.label}`}
                      className="shrink-0 opacity-90 hover:opacity-100">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </header>

                  <div className="p-3 space-y-3 bg-[#F8F8F6] dark:bg-[#1C1A1E]">
                    {soon ? (
                      <p className="text-[11px] text-slate-500">Not on sale yet{entry.date ? ` · opens ${fmtShortDate(entry.date)}` : ''}.</p>
                    ) : all.length > 0 ? (
                      byVenue.size > 0 ? (
                        [...byVenue].map(([venue, list]) => (
                          <div key={venue}>
                            <p className="flex items-center gap-1 text-[11px] font-extrabold text-slate-800 dark:text-slate-100 mb-1.5">
                              <MapPin className="w-3 h-3 text-[#2D6A4F]" /> {venue}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {list.map(s => (
                                <ShowPill key={s.id} s={s} accent={p.color}
                                  onClick={() => onBook(entry, s.bookingUrl, s.venue, s.date)} />
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5" /> No {p.short} showings {dp ? dp.long : 'on this day'}. Try another day.
                        </p>
                      )
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.hint}</p>
                        {entry.times && <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{entry.times}</p>}
                        {venues.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {venues.map(v => (
                              <button key={v.venueKey} type="button" onClick={() => onBook(entry, v.bookingUrl, v.venue)}
                                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-left cursor-pointer transition hover:opacity-90"
                                style={{ borderColor: p.color }}>
                                <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#2D6A4F]" />
                                  <span className="truncate">{v.venue}</span>
                                </span>
                                <span className="shrink-0 text-[10px] font-black px-2 py-1 rounded-lg" style={{ backgroundColor: p.color, color: p.textColor }}>
                                  Pick time
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button type="button" onClick={() => onBook(entry, entry.bookingUrl || entry.url)}
                            className="w-full py-2.5 rounded-xl text-[12px] font-black cursor-pointer"
                            style={{ backgroundColor: p.color, color: p.textColor }}>
                            {p.bookLabel}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-[10px] text-center text-slate-400">
            Prices and seats are set by the cinema. You complete payment on their site.
          </p>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── explorer ─────────────────────────
export const CinemaExplorer: React.FC<CinemaExplorerProps> = ({ movies, onBookMovie, userCoords = null }) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'now' | 'soon'>('now');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const origin = useMemo(() => userCoords || NAIROBI_CENTRE, [userCoords]);
  const groups = useMemo(() => buildGroups(movies), [movies]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, tab, selectedGenre, selectedArea, selectedFormat, selectedProvider]);

  const providersPresent = useMemo(
    () => [...new Set(groups.flatMap(g => g.providerIds))].filter(id => id !== 'other'),
    [groups],
  );
  const areasPresent = useMemo(() => {
    const ids = new Set(groups.flatMap(g => [...g.areaIds]));
    return AREAS.filter(a => ids.has(a.id));
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result = groups.filter(g => {
      if (tab === 'now' ? g.comingSoon : !g.comingSoon) return false;
      if (selectedProvider !== 'all' && !g.providerIds.includes(selectedProvider)) return false;
      if (selectedArea !== 'all' && !g.areaIds.has(selectedArea)) return false;
      if (selectedFormat !== 'All' && !g.formats.includes(selectedFormat)) return false;
      if (selectedGenre !== 'All' && !(g.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())) return false;
      if (q) {
        const hay = [g.title, g.genre, ...g.formats, ...g.venueLabels, ...g.providerIds.map(id => providerOf(id).label)]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dist = (g: MovieGroup) => (g.coords.length ? Math.min(...g.coords.map(c => distanceKm(origin, c))) : 999);
    if (tab === 'soon') result.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
    else result.sort((a, b) => dist(a) - dist(b) || a.title.localeCompare(b.title));
    return result;
  }, [groups, tab, query, selectedGenre, selectedArea, selectedFormat, selectedProvider, origin]);

  const opened = useMemo(() => groups.find(g => g.key === openKey) || null, [groups, openKey]);
  const closeSheet = useCallback(() => setOpenKey(null), []);

  const book = useCallback((entry: CinemaMovie, url: string, venue?: string, date?: string) => {
    const payload: CinemaMovie = {
      ...entry,
      bookingUrl: url,
      locationName: venue || entry.locationName,
      date: date || entry.date,
    };
    if (onBookMovie) onBookMovie(payload);
    else window.open(url, '_blank', 'noopener');
  }, [onBookMovie]);

  const anyFilter = selectedGenre !== 'All' || selectedArea !== 'all' || selectedFormat !== 'All' || selectedProvider !== 'all' || !!query;
  const reset = () => { setQuery(''); setSelectedGenre('All'); setSelectedArea('all'); setSelectedFormat('All'); setSelectedProvider('all'); };

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs ${
      on ? 'bg-[#2D6A4F] text-white shadow-xs'
         : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search movies, cinemas, Anga, Century..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-semibold bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2D6A4F]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Now showing / Coming soon */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-black">
        {([['now', 'Now Showing'], ['soon', 'Coming Soon']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`py-2 rounded-xl transition cursor-pointer ${tab === id ? 'bg-white dark:bg-[#1C1A1E] text-[#2D6A4F] shadow-xs' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Ticketing provider pills */}
      {providersPresent.length > 0 && (
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          <button type="button" onClick={() => setSelectedProvider('all')} className={chip(selectedProvider === 'all')}>All sites</button>
          {providersPresent.map(id => {
            const p = providerOf(id);
            const on = selectedProvider === id;
            return (
              <button key={id} type="button" onClick={() => setSelectedProvider(on ? 'all' : id)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs border-2 ${on ? '' : 'bg-transparent text-slate-600 dark:text-slate-300'}`}
                style={on ? { backgroundColor: p.color, borderColor: p.color, color: p.textColor } : { borderColor: p.color }}>
                {p.short}
              </button>
            );
          })}
        </div>
      )}

      {/* Genre pills */}
      <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {GENRE_FILTERS.map(g => (
          <button key={g} type="button" onClick={() => setSelectedGenre(g)} className={chip(selectedGenre === g)}>{g}</button>
        ))}
      </div>

      {/* Cinema + format */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px]">
            <option value="all" className="bg-white dark:bg-[#1C1A1E]">All Cinemas</option>
            {areasPresent.map(a => <option key={a.id} value={a.id} className="bg-white dark:bg-[#1C1A1E]">{a.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <Clapperboard className="w-3.5 h-3.5 text-slate-400" />
          <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer">
            {FORMAT_FILTERS.map(f => <option key={f} value={f} className="bg-white dark:bg-[#1C1A1E]">{f === 'All' ? 'All Formats' : f}</option>)}
          </select>
        </div>
        {anyFilter && (
          <button type="button" onClick={reset} className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer ml-auto">
            Reset Filters
          </button>
        )}
      </div>

      <div className="text-xs font-bold text-slate-500 pt-1">
        {filtered.length} {filtered.length === 1 ? 'movie' : 'movies'} {tab === 'now' ? 'showing' : 'coming soon'}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Film className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No movies match your filters</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">Try resetting your search or choosing a different cinema.</p>
          <button type="button" onClick={reset}
            className="px-4 py-2 bg-[#2D6A4F] text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition cursor-pointer">
            View All Showings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filtered.slice(0, visibleCount).map(g => {
            const venueCount = g.venueLabels.length;
            const venueText = venueCount === 0 ? '' : venueCount === 1 ? g.venueLabels[0] : `${g.venueLabels[0]} +${venueCount - 1} more`;
            const nextText = g.next
              ? `${dateParts(g.next.date).dow === 'Today' ? 'Today' : fmtShortDate(g.next.date)}${g.next.time ? ' · ' + fmt12(g.next.time) : ''}`
              : g.comingSoon && g.releaseDate ? `Opens ${fmtShortDate(g.releaseDate)}` : '';
            return (
              <div key={g.key} role="button" tabIndex={0}
                onClick={() => setOpenKey(g.key)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(g.key); } }}
                className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs cursor-pointer hover:border-[#2D6A4F] transition flex flex-col justify-between group">
                <div>
                  <div className="h-44 sm:h-52 rounded-xl mb-2.5 relative overflow-hidden">
                    <Poster src={g.img} alt={g.title} className="absolute inset-0 w-full h-full" />
                    <span className="absolute top-2 left-2 bg-black/75 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {g.formats.join(' / ')}
                    </span>
                    {g.rating && (
                      <span className="absolute top-2 right-2 bg-white/90 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-md">{g.rating}</span>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                      {g.providerIds.filter(id => id !== 'other').map(id => <ProviderDot key={id} id={id} />)}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-[#2D6A4F] transition">{g.title}</h4>
                  {g.genre && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{[g.genre, fmtRuntime(g.runtimeMin)].filter(Boolean).join(' · ')}</p>}
                  {venueText && (
                    <p className="text-[11px] text-[#2D6A4F] font-bold mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{venueText}</span>
                    </p>
                  )}
                  {nextText && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{g.next ? 'Next: ' : ''}{nextText}
                    </p>
                  )}
                </div>

                <div className="w-full mt-2.5 py-2 bg-[#2D6A4F] group-hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-xs">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{g.comingSoon ? 'Details' : 'Showtimes & Tickets'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div className="pt-2 text-center">
          <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer">
            Load More Movies ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {opened && <MovieSheet key={opened.key} group={opened} onClose={closeSheet} onBook={book} />}
    </div>
  );
};

// re-exported so other tabs can show provider badges without importing the config directly
export { PROVIDERS };
