import React, { useEffect, useState, memo } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Snowflake, Moon } from 'lucide-react';
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

// Short everyday wording for the chip
const SHORT: Record<WeatherKind, string> = {
  clear: 'Sunny', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Foggy',
  drizzle: 'Light rain', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorms',
};

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
  /** quiet variant: small label before the words, e.g. "Forecast" -> "Forecast 7 PM · Cloudy, 22°C" */
  prefix?: string;
  /** event start time (ISO). When set, shows the forecast for that hour instead of the whole day. */
  at?: string | Date | null;
  /** quiet: tiny icon + temperature with no background, for sitting beside a button. overlay: small dark pill for event images. inline: pill with text for a selected-day header. icon: bare icon for calendar cells. */
  variant?: 'overlay' | 'inline' | 'icon' | 'quiet';
  /** icon variant only: 'white' for use on the orange selected-day cell */
  tone?: 'color' | 'white';
  className?: string;
};

export const WeatherChip = memo(function WeatherChip({ date, lat, lng, at, prefix, variant = 'overlay', tone = 'color', className = '' }: Props) {
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
    // Plain words, e.g. "Cloudy, 22°C" or "Rain likely, 21°C". `prefix` adds context like "Forecast for 7 PM".
    const night = w.hourly && typeof w.hour === 'number' && (w.hour >= 19 || w.hour < 6);
    const clearNight = night && (kind === 'clear' || kind === 'partly');
    const Shown = clearNight ? Moon : Icon;
    const words = rainy && kind !== 'storm' ? 'Rain likely' : clearNight ? 'Clear night' : SHORT[kind];
    const colour = rainy ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300';
    const when = w.hourly && typeof w.hour === 'number' ? `${w.hour % 12 || 12} ${w.hour >= 12 ? 'PM' : 'AM'}` : '';
    return (
      <span
        role="img"
        aria-label={`${prefix ? prefix + ' ' : ''}${when ? when + ': ' : ''}${tip}`}
        title={tip}
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold leading-tight ${colour} ${className}`}
      >
        <Shown className={`w-3.5 h-3.5 shrink-0 ${rainy ? 'text-sky-500' : clearNight ? 'text-indigo-400' : tint}`} />
        <span>
          {prefix && <span className="text-slate-400 dark:text-slate-500 font-medium">{prefix}{when ? ` ${when}` : ''} · </span>}
          {words}, {w.hourly ? `${hi}°C` : `${lo}–${hi}°C`}
        </span>
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
