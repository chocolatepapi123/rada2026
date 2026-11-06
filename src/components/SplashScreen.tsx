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
        @keyframes radaMarkIn { 0% { opacity: .0; transform: translateY(6px) } 100% { opacity: 1; transform: none } }
        @keyframes radaRise { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .rada-anim { animation: none !important } }
      `}</style>

      {/* the mark, drawn straight on the screen: no box. Same size and spot as the Android launch screen (250dp, centred). */}
      <div className="absolute left-1/2 top-1/2 pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }}>
        <img
          src="/rada-mark.png"
          alt="RADA"
          draggable={false}
          className="rada-anim block h-auto"
          style={{ width: 250, maxWidth: '70vw', animation: 'radaMarkIn 700ms ease-out both' }}
        />
      </div>

      <div className="flex-1" />

      {/* a plain, friendly hello at the bottom. No spinners, no bars. */}
      <div
        className="relative w-full px-8 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
      >
        <p
          className="rada-anim text-[15px] font-semibold text-white/80"
          style={{ animation: 'radaRise 600ms ease-out 250ms both' }}
        >
          {hello}
        </p>
        {askText && (
          <p
            className="rada-anim mt-1 text-[24px] leading-tight font-extrabold text-white"
            style={{ letterSpacing: '-0.01em', animation: 'radaRise 700ms ease-out 400ms both' }}
          >
            {askText}
          </p>
        )}
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
