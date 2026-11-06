import React, { useEffect, useState, memo } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Snowflake } from 'lucide-react';
import { getForecast, toDateKey, describeWeather, pickForecast, type DayForecast, type WeatherKind } from '../lib/weather';

/**
 * Forecast for one day, or for the event's start hour when `at` (an ISO start time) is given.
 * null while loading, if out of range, or offline.
 */
export function useDayWeather(date?: string | Date | null, lat?: number | null, lng?: number | null, at?: string | Date | null) {
  const key = toDateKey(at || date);
  const atKey = at ? String(at) : '';
  const [w, setW] = useState<DayForecast | null>(null);
  useEffect(() => {
    let off = false;
    setW(null);
    if (!key) return;
    getForecast(lat, lng).then((f) => { if (!off) setW(pickForecast(f, key, atKey || null)); });
    return () => { off = true; };
  }, [key, lat, lng, atKey]);
  return w;
}

const ICONS: Record<WeatherKind, { Icon: React.ComponentType<{ className?: string }>; tint: string; onDark: string }> = {
  clear:   { Icon: Sun,            tint: 'text-amber-500',  onDark: 'text-amber-300' },
  partly:  { Icon: CloudSun,       tint: 'text-amber-500',  onDark: 'text-amber-300' },
  cloudy:  { Icon: Cloud,          tint: 'text-slate-400',  onDark: 'text-slate-200' },
  fog:     { Icon: CloudFog,       tint: 'text-slate-400',  onDark: 'text-slate-200' },
  drizzle: { Icon: CloudDrizzle,   tint: 'text-sky-500',    onDark: 'text-sky-300' },
  rain:    { Icon: CloudRain,      tint: 'text-sky-500',    onDark: 'text-sky-300' },
  snow:    { Icon: Snowflake,      tint: 'text-cyan-400',   onDark: 'text-cyan-200' },
  storm:   { Icon: CloudLightning, tint: 'text-violet-500', onDark: 'text-violet-300' },
};

type Props = {
  date?: string | Date | null;
  lat?: number | null;
  lng?: number | null;
  /** event start time (ISO). When set, shows the forecast for that hour instead of the whole day. */
  at?: string | Date | null;
  /** quiet: tiny icon + temperature with no background, for sitting beside a button. overlay: small dark pill for event images. inline: pill with text for a selected-day header. icon: bare icon for calendar cells. */
  variant?: 'overlay' | 'inline' | 'icon' | 'quiet';
  /** icon variant only: 'white' for use on the orange selected-day cell */
  tone?: 'color' | 'white';
  className?: string;
};

export const WeatherChip = memo(function WeatherChip({ date, lat, lng, at, variant = 'overlay', tone = 'color', className = '' }: Props) {
  const w = useDayWeather(date, lat, lng, at);
  if (!w) return null;

  const { label, kind } = describeWeather(w.code);
  const { Icon, tint, onDark } = ICONS[kind];
  const hi = Math.round(w.tmax);
  const lo = Math.round(w.tmin);
  const rainy = w.rain >= 40;
  const temp = w.hourly ? `${hi}°C` : `${lo}–${hi}°C`;
  const tip = `${label}, ${temp}${w.rain >= 20 ? `, ${w.rain}% chance of rain` : ''}`;

  if (variant === 'quiet') {
    return (
      <span
        role="img"
        aria-label={tip}
        title={tip}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 ${className}`}
      >
        <Icon className={`w-3.5 h-3.5 ${tint}`} />
        <span>{hi}°</span>
        {rainy && <span className="text-sky-500">{w.rain}%</span>}
      </span>
    );
  }

  if (variant === 'icon') {
    return (
      <span role="img" aria-label={tip} title={tip} className={`inline-flex ${className}`}>
        <Icon className={`w-3.5 h-3.5 ${tone === 'white' ? 'text-white' : tint}`} />
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        role="img"
        aria-label={tip}
        title={tip}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 ${className}`}
      >
        <Icon className={`w-4 h-4 ${tint}`} />
        <span>{label} · {hi}°</span>
        {rainy && <span className="text-sky-500">{w.rain}%</span>}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={tip}
      title={tip}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-[9px] font-black ${className}`}
    >
      <Icon className={`w-3 h-3 ${onDark}`} />
      <span>{hi}°</span>
      {rainy && <span className="text-sky-300">{w.rain}%</span>}
    </span>
  );
});
