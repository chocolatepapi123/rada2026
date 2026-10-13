import React, { useEffect, useRef } from 'react';
import { X, MapPin, Car, Navigation, ExternalLink } from 'lucide-react';
import { SpotItem } from '../types.ts';

interface LocationMapModalProps {
  spot: SpotItem | null;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  spot,
  onClose,
  showToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!spot) return;
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Small delay to ensure modal container has dimensions
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (mapContainerRef.current) {
        const map = L.map(mapContainerRef.current).setView([spot.lat, spot.lng], 15);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const marker = L.marker([spot.lat, spot.lng]).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <b style="color: #E0533C; font-size: 13px;">${spot.title}</b><br/>
            <span>${spot.neighborhood} • ★${spot.rating}</span><br/>
            <span style="color: #64748b; font-size: 11px;">${spot.address}</span>
          </div>
        `).openPopup();

        map.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [spot]);

  if (!spot) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-4 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/80 text-[#E0533C] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-[#E0533C] truncate">{spot.title}</h3>
              <p className="text-[10px] text-slate-500 truncate">{spot.neighborhood} • {spot.address}</p>
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
        <div 
          ref={mapContainerRef} 
          className="h-60 w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden relative z-10"
        />

        <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#121113] rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Exact GPS Coordinates</span>
            <span className="text-[11px] text-slate-400 font-mono">{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</span>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-[11px] flex items-center gap-1 hover:opacity-90 transition"
          >
            <Navigation className="w-3 h-3" /> Directions
          </a>
        </div>

        {/* Uber & Bolt Ride Hailing */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              showToast(`Requesting Uber to ${spot.title}...`);
              window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(spot.address)}`, '_blank');
            }}
            className="py-2.5 bg-black text-white hover:bg-slate-800 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5" /> Uber Ride
          </button>
          <button
            onClick={() => {
              showToast(`Opening Bolt to ${spot.title}...`);
              window.open('https://bolt.eu/', '_blank');
            }}
            className="py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5" /> Bolt Ride
          </button>
        </div>
      </div>
    </div>
  );
};
