import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Car, Navigation, ExternalLink } from 'lucide-react';
import { SpotItem, EventItem } from '../types.ts';
import { hasEventCoords, resolveEventCoords, eventGoogleMapsUrl } from '../utils/eventUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { loadLeaflet } from '../lib/leaflet.ts';

interface LocationMapModalProps {
  spot: SpotItem | null;
  /** Show an event venue instead of a spot. Coordinates are looked up on demand when the event has none. */
  event?: EventItem | null;
  onClose: () => void;
  showToast: (msg: string, options?: ToastOptions) => void;
}

const escapeHtml = (v: string) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  spot,
  event = null,
  onClose,
  showToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Normalised place (spot or event venue)
  const [eventCoords, setEventCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'failed'>('idle');

  useEffect(() => {
    setEventCoords(null);
    if (!event || spot) { setGeoState('idle'); return; }
    if (hasEventCoords(event)) {
      setEventCoords({ lat: event.lat, lng: event.lng });
      setGeoState('idle');
      return;
    }
    let cancelled = false;
    setGeoState('loading');
    resolveEventCoords(event).then(c => {
      if (cancelled) return;
      if (c) { setEventCoords(c); setGeoState('idle'); } else { setGeoState('failed'); }
    });
    return () => { cancelled = true; };
  }, [event, spot]);

  const place = spot
    ? {
        title: spot.title,
        subtitle: `${spot.neighborhood} • ${spot.address}`,
        popupMeta: `${spot.neighborhood} • ★${spot.rating}`,
        address: spot.address,
        lat: spot.lat as number | null,
        lng: spot.lng as number | null,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
      }
    : event
    ? {
        title: event.title,
        subtitle: event.address ? `${event.location} • ${event.address}` : event.location,
        popupMeta: `${event.date}${event.time ? ` • ${event.time}` : ''}`,
        address: event.address || event.location,
        lat: eventCoords ? eventCoords.lat : null,
        lng: eventCoords ? eventCoords.lng : null,
        mapsUrl: eventGoogleMapsUrl(event)
      }
    : null;

  const placeLat = place?.lat ?? null;
  const placeLng = place?.lng ?? null;

  useEffect(() => {
    if (!place || placeLat == null || placeLng == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Leaflet is loaded on demand (no longer in index.html) so it can't block app start
    loadLeaflet().then((L) => {
    if (cancelled || !L || !mapContainerRef.current) return;

    // Small delay to ensure modal container has dimensions
    timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: true }).setView([placeLat, placeLng], 15);
        mapInstanceRef.current = map;

        // 100% Free OpenStreetMap raster tiles (Zero API key required)
        const isDark = document.documentElement.classList.contains('dark');
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
          className: isDark ? 'rada-osm-dark' : '',
        }).addTo(map);

        if (isDark) {
          const pane = map.getPane('tilePane');
          if (pane) {
            pane.style.filter = 'invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%)';
          }
        }

        const pinIcon = L.divIcon({
          className: 'rada-map-pin',
          html: '<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg"><path d="M14 1C7 1 1.5 6.4 1.5 13.2 1.5 22 14 35 14 35s12.5-13 12.5-21.8C26.5 6.4 21 1 14 1Z" fill="none" stroke="#E0533C" stroke-width="2.4" stroke-linejoin="round"/><circle cx="14" cy="13" r="4.2" fill="#E0533C"/></svg>',
          iconSize: [28, 36],
          iconAnchor: [14, 35],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([placeLat, placeLng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <b style="color: #E0533C; font-size: 13px;">${escapeHtml(place.title)}</b><br/>
            <span>${escapeHtml(place.popupMeta)}</span><br/>
            <span style="color: #64748b; font-size: 11px;">${escapeHtml(place.address)}</span>
          </div>
        `).openPopup();

        map.invalidateSize();
      }
    }, 150);
    }).catch(() => { /* map stays blank; the directions links still work */ });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [spot, event, placeLat, placeLng]);

  if (!place) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-4 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/80 text-[#E0533C] dark:text-[#D17A68] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-[#E0533C] dark:text-[#D17A68] truncate">{place.title}</h3>
              <p className="text-[10px] text-slate-500 truncate">{place.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Leaflet Map Display */}
        {placeLat != null && placeLng != null ? (
          <div 
            ref={mapContainerRef} 
            className="h-60 w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 rada-sketch-map"
          />
        ) : (
          <div className="h-60 w-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-[#F8F8F6] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 text-center px-6">
            <MapPin className="w-6 h-6 text-[#E0533C]" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {geoState === 'loading' ? 'Finding this venue on the map...' : 'We could not pin this venue exactly'}
            </p>
            {geoState === 'failed' && (
              <p className="text-[11px] text-slate-500">Open it in Google Maps to see the exact spot.</p>
            )}
          </div>
        )}

        <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#121113] rounded-2xl flex items-center justify-between text-xs">
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              {placeLat != null && placeLng != null ? 'Exact GPS Coordinates' : 'Venue address'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block truncate">
              {placeLat != null && placeLng != null
                ? `${placeLat.toFixed(4)}, ${placeLng.toFixed(4)}`
                : place.address}
            </span>
          </div>
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-[11px] flex items-center gap-1 hover:opacity-90 transition shrink-0"
          >
            <Navigation className="w-3 h-3" /> Directions
          </a>
        </div>

        {/* Uber & Bolt Ride Hailing */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(place.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 bg-black text-white hover:bg-slate-800 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5" /> Uber Ride
          </a>
          <a
            href="https://bolt.eu/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5" /> Bolt Ride
          </a>
        </div>
      </div>
    </div>
  );
};
