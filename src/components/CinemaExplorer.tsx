import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Film, MapPin, Ticket, Clapperboard, Calendar, Star, Sparkles } from 'lucide-react';
import { CinemaMovie } from '../types.ts';
import { distanceKm, LatLng, NEIGHBORHOOD_COORDS } from '../lib/geo.ts';

interface CinemaExplorerProps {
  movies: CinemaMovie[];
  onBookMovie?: (movie: CinemaMovie) => void;
  userCoords?: LatLng | null;
}

const CINEMA_VENUES = [
  { id: 'all', label: 'All Cinemas' },
  { id: 'sarit', label: 'Sarit Centre', match: ['sarit'], coords: { lat: -1.2635, lng: 36.8028 } },
  { id: 'westgate', label: 'Westgate', match: ['westgate'], coords: { lat: -1.2582, lng: 36.8041 } },
  { id: 'two_rivers', label: 'Two Rivers', match: ['two rivers'], coords: { lat: -1.2057, lng: 36.7745 } },
  { id: 'garden_city', label: 'Garden City', match: ['garden city'], coords: { lat: -1.2322, lng: 36.8778 } },
  { id: 'junction', label: 'Junction Mall', match: ['junction'], coords: { lat: -1.2989, lng: 36.7618 } },
  { id: 'prestige', label: 'Prestige Plaza', match: ['prestige'], coords: { lat: -1.2982, lng: 36.7865 } },
  { id: 'diamond', label: 'Diamond Plaza', match: ['diamond'], coords: { lat: -1.2612, lng: 36.8208 } },
  { id: 'panari', label: 'Panari Sky', match: ['panari'], coords: { lat: -1.3324, lng: 36.8576 } },
];

const GENRE_FILTERS = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Thriller',
  'Romance'
];

const FORMAT_FILTERS = ['All', '2D', '3D', 'IMAX'];

const PAGE_SIZE = 16;

export const CinemaExplorer: React.FC<CinemaExplorerProps> = ({
  movies,
  onBookMovie,
  userCoords = null,
}) => {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Fallback coords for Nairobi centre (-1.2864, 36.8172)
  const effectiveOrigin = userCoords || { lat: -1.2864, lng: 36.8172 };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedGenre, selectedVenue, selectedFormat]);

  const getMovieCoords = (m: CinemaMovie): LatLng => {
    const loc = (m.location || m.locationName || '').toLowerCase();
    for (const v of CINEMA_VENUES) {
      if (v.match && v.match.some(keyword => loc.includes(keyword))) {
        return v.coords;
      }
    }
    return { lat: -1.2864, lng: 36.8172 };
  };

  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.genre && m.genre.toLowerCase().includes(q)) ||
        (m.locationName && m.locationName.toLowerCase().includes(q)) ||
        (m.format && m.format.toLowerCase().includes(q)) ||
        (m.times && m.times.toLowerCase().includes(q))
      );
    }

    if (selectedGenre !== 'All') {
      result = result.filter(m => (m.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()));
    }

    if (selectedVenue !== 'all') {
      const targetVenue = CINEMA_VENUES.find(v => v.id === selectedVenue);
      if (targetVenue?.match) {
        result = result.filter(m => {
          const loc = (m.location || m.locationName || '').toLowerCase();
          return targetVenue.match!.some(k => loc.includes(k));
        });
      }
    }

    if (selectedFormat !== 'All') {
      result = result.filter(m => (m.format || '').toLowerCase().includes(selectedFormat.toLowerCase()));
    }

    // Sort closest to user location first (silently, without writing or telling the user)
    result.sort((a, b) => {
      const distA = distanceKm(effectiveOrigin, getMovieCoords(a));
      const distB = distanceKm(effectiveOrigin, getMovieCoords(b));
      return distA - distB;
    });

    return result;
  }, [movies, query, selectedGenre, selectedVenue, selectedFormat, effectiveOrigin]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, cinemas, genres, showtimes..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-semibold bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2D6A4F]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Genre Pills */}
      <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
        {GENRE_FILTERS.map(genre => (
          <button
            key={genre}
            type="button"
            onClick={() => setSelectedGenre(genre)}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs ${
              selectedGenre === genre
                ? 'bg-[#2D6A4F] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Cinema Hall & Format Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Searchbox for Exact Cinema Location */}
        <div className="relative flex items-center">
          <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={selectedVenue === 'all' ? '' : (CINEMA_VENUES.find(v => v.id === selectedVenue)?.label || selectedVenue)}
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              if (!val.trim()) {
                setSelectedVenue('all');
                return;
              }
              const matched = CINEMA_VENUES.find(v => v.label.toLowerCase().includes(val) || v.id.toLowerCase().includes(val));
              setSelectedVenue(matched ? matched.id : e.target.value);
            }}
            placeholder="Search exact cinema location..."
            className="pl-8 pr-7 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#2D6A4F]"
          />
          {selectedVenue !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedVenue('all')}
              className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Reset cinema location"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <Clapperboard className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {FORMAT_FILTERS.map(f => (
              <option key={f} value={f} className="bg-white dark:bg-[#1C1A1E]">
                {f === 'All' ? 'All Formats' : f}
              </option>
            ))}
          </select>
        </div>

        {(selectedGenre !== 'All' || selectedVenue !== 'all' || selectedFormat !== 'All' || query) && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedGenre('All');
              setSelectedVenue('all');
              setSelectedFormat('All');
            }}
            className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
        <span>{filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'} showing</span>
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Film className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No movies match your filters</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try resetting your search query or selecting a different cinema hall.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedGenre('All');
              setSelectedVenue('all');
              setSelectedFormat('All');
            }}
            className="px-4 py-2 bg-[#2D6A4F] text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition cursor-pointer"
          >
            View All Showings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredMovies.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.id}
              onClick={() => onBookMovie?.(movie)}
              className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs cursor-pointer hover:border-[#2D6A4F] transition flex flex-col justify-between group"
            >
              <div>
                <div
                  className="h-44 sm:h-52 rounded-xl bg-cover bg-center mb-2.5 relative overflow-hidden bg-slate-200 dark:bg-slate-800"
                  style={{ backgroundImage: `url('${movie.img}')` }}
                >
                  <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {movie.format || '2D'}
                  </span>
                  {movie.genre && (
                    <span className="absolute bottom-2 left-2 bg-[#2D6A4F]/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md truncate max-w-[85%]">
                      {movie.genre}
                    </span>
                  )}
                </div>

                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-[#2D6A4F] transition">
                  {movie.title}
                </h4>
                <p className="text-[11px] text-[#2D6A4F] font-bold truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{movie.locationName || movie.location}</span>
                </p>
                {movie.times && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">
                    {movie.times}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookMovie?.(movie);
                }}
                className="w-full mt-2.5 py-2 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Book Movie</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredMovies.length && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
          >
            Load More Movies ({filteredMovies.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
