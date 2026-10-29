// ─────────────────────────────────────────────────────────────────────────────
// In src/types.ts, REPLACE the existing `CinemaMovie` interface with this block.
// Every new field is optional, so the old feed (lib/cinema.ts) keeps working.
// ─────────────────────────────────────────────────────────────────────────────

/** One purchasable showing, with a direct link to buy that exact time. */
export interface CinemaShowtime {
  id: string;
  venue: string;            // "Anga Sky Panari"
  venueKey: string;         // "anga_panari"
  date: string;             // YYYY-MM-DD
  time: string | null;      // "19:20" (24h, Nairobi time)
  startsAt?: string | null; // ISO with +03:00
  format?: string | null;
  screen?: string | null;
  priceKes?: number | null;
  bookingUrl: string;
}

/** A cinema the film plays at, with that cinema's own booking page. */
export interface CinemaVenueLink {
  venue: string;
  venueKey: string;
  bookingUrl: string;
}

export interface CinemaMovie {
  id: number | string;
  title: string;
  genre?: string;
  /** Release date (YYYY-MM-DD) from the live feed. */
  date: string;
  /** "2D" | "3D" | "IMAX" (older feed: rating or "Now Showing" label). */
  format: string;
  img: string;
  /** Direct movie page link. */
  url: string;
  /** Ticket / booking link built per movie. */
  bookingUrl: string;
  /** Cinema name (used as the filter key). */
  location?: string;
  locationName?: string;
  /** Showtimes text (summary). */
  times?: string;

  // ── added for the multi-provider cinema experience ──
  /** anga | century | kenyabuzz | unseen */
  provider?: string;
  synopsis?: string;
  rating?: string;
  runtimeMin?: number;
  language?: string;
  trailerUrl?: string;
  status?: 'now_showing' | 'coming_soon' | 'special';
  /** Every cinema this film plays at on this provider. */
  venues?: CinemaVenueLink[];
  /** Individual showtimes (providers that expose them, e.g. Anga). */
  showtimes?: CinemaShowtime[];
}
