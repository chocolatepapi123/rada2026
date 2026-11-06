/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

// Must stay equal to the phone-bar / theme-color colour (index.html, App.tsx, android.yml),
// so the screen edges blend into the status and navigation bars.
const SPLASH_ORANGE = '#E05328';

interface SplashScreenProps {
  onDismiss?: () => void;
  durationMs?: number;
}

/**
 * The splash look on its own (no timers), so the "checking your session" screen in App.tsx
 * can show exactly the same thing and the two never visibly jump.
 */
export const SplashFace: React.FC<{ progressMs?: number }> = ({ progressMs = 1600 }) => {
  const greeting = getTimeOfDayGreeting();
  // "Good morning, leo rada ni gani" -> small line + big line
  const i = greeting.indexOf(',');
  const hello = (i > -1 ? greeting.slice(0, i) : greeting).trim();
  const ask = i > -1 ? greeting.slice(i + 1).trim() : '';
  const askText = ask ? ask.charAt(0).toUpperCase() + ask.slice(1) + '?' : '';

  return (
    <div
      className="absolute inset-0 overflow-hidden flex flex-col items-center select-none"
      style={{ background: SPLASH_ORANGE }}
    >
      <style>{`
        @keyframes radaRing { 0% { transform: scale(.55); opacity: .0 } 25% { opacity: .55 } 100% { transform: scale(1.5); opacity: 0 } }
        @keyframes radaMarkIn { 0% { opacity: 0; transform: scale(.9) translateY(6px) } 100% { opacity: 1; transform: none } }
        @keyframes radaRise { 0% { opacity: 0; transform: translateY(14px) } 100% { opacity: 1; transform: none } }
        @keyframes radaFill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @media (prefers-reduced-motion: reduce) { .rada-anim { animation: none !important } }
      `}</style>

      {/* soft light behind the mark; the edges stay solid orange so the phone bars blend in */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 42% at 50% 42%, rgba(255,160,110,0.38) 0%, rgba(255,160,110,0) 70%)' }}
      />

      {/* radar rings: a quiet nod to the name */}
      <div className="absolute left-1/2 pointer-events-none" style={{ top: '42%' }}>
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className="rada-anim absolute rounded-full border border-white/40"
            style={{
              width: 'min(120vw, 560px)',
              height: 'min(120vw, 560px)',
              left: 'calc(min(120vw, 560px) / -2)',
              top: 'calc(min(120vw, 560px) / -2)',
              animation: `radaRing 3200ms cubic-bezier(.2,.6,.3,1) ${n * 900}ms infinite`,
            }}
          />
        ))}
      </div>

      {/* the mark, drawn straight on the screen: no box */}
      <div className="relative flex-1 w-full flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <img
          src="/rada-mark.png"
          alt="RADA"
          draggable={false}
          className="rada-anim relative w-[64vw] max-w-[320px] h-auto"
          style={{ animation: 'radaMarkIn 900ms cubic-bezier(.16,1,.3,1) both', filter: 'drop-shadow(0 6px 18px rgba(120,30,0,.25))' }}
        />
      </div>

      {/* greeting, anchored low like a native welcome screen */}
      <div
        className="relative w-full px-8 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 44px)' }}
      >
        <p
          className="rada-anim text-[11px] font-bold uppercase text-white/70"
          style={{ letterSpacing: '0.32em', animation: 'radaRise 700ms ease-out 350ms both' }}
        >
          {hello}
        </p>
        {askText && (
          <p
            className="rada-anim mt-2 text-[26px] leading-tight font-extrabold text-white"
            style={{ letterSpacing: '-0.02em', animation: 'radaRise 800ms ease-out 500ms both' }}
          >
            {askText}
          </p>
        )}
        <div className="mx-auto mt-7 h-[3px] w-12 rounded-full bg-white/25 overflow-hidden">
          <div
            className="rada-anim h-full w-full rounded-full bg-white origin-left"
            style={{ animation: `radaFill ${progressMs}ms cubic-bezier(.4,0,.2,1) both` }}
          />
        </div>
      </div>
    </div>
  );
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  durationMs = 2000,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), durationMs);
    // Fully unmount after the fade-out (450ms after it starts)
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }, durationMs + 450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="RADA is loading"
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: SPLASH_ORANGE }}
    >
      <SplashFace progressMs={durationMs} />
    </div>
  );
};
