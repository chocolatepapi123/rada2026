/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

interface SplashScreenProps {
  onDismiss?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  durationMs = 2000,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const greeting = getTimeOfDayGreeting();

  useEffect(() => {
    // Start fade-out slightly before dismissal to provide a smooth transition
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs);

    // Fully unmount after fade-out transition (400ms after fade starts)
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #E05328 0%, #D94E28 100%)',
      }}
    >
      {/* Decorative ambient background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-black/10 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        {/* Animated Centered Logo with 2-second smooth fade-in and scale-up effect */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-white/20 rounded-3xl blur-xl transition-all duration-1000 group-hover:blur-2xl" />
          <img
            src="/logo.jpg"
            alt="RADA"
            className="relative w-44 sm:w-52 md:w-60 max-w-[70vw] h-auto object-contain rounded-3xl shadow-2xl transition-all duration-[2000ms] ease-out transform"
            style={{
              animation: 'splashScaleFade 2000ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />
        </div>

        {/* Brand Header & Animated Dynamic Time-of-Day Greeting */}
        <div 
          className="mt-6 space-y-2 transition-all duration-1000 delay-300"
          style={{
            animation: 'splashTaglineFade 1600ms ease-out 400ms backwards',
          }}
        >
          <h1 className="text-white text-3xl sm:text-4xl font-black tracking-widest uppercase drop-shadow-md">
            RADA
          </h1>
          <p className="text-white/95 text-sm sm:text-base font-semibold tracking-wide drop-shadow-sm transition-opacity duration-1000">
            {greeting}
          </p>
        </div>

        {/* Minimal loading indicator */}
        <div className="mt-8 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
