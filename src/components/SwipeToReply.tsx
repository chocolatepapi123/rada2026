import React, { useEffect, useRef, useState } from 'react';
import { Reply } from 'lucide-react';

interface SwipeToReplyProps {
  onReply: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const TRIGGER = 56; // px you have to pull before it counts as a reply
const MAX = 84;     // the row never travels further than this

/**
 * WhatsApp-style swipe to reply: drag a message to the right, a reply icon pops in,
 * let go past the threshold and the reply starts. Vertical scrolling is never blocked,
 * and the gesture is kept away from the app's tab-swipe.
 */
export const SwipeToReply: React.FC<SwipeToReplyProps> = ({ onReply, disabled, className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onReply);
  cb.current = onReply;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    let sx = 0;
    let sy = 0;
    let mode: 'idle' | 'h' | 'v' = 'idle';
    let armed = false;
    let tracking = false;

    const reset = () => {
      tracking = false;
      mode = 'idle';
      armed = false;
      setDragging(false);
      setDx(0);
    };

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation(); // the app's tab-swipe must not see this gesture
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      mode = 'idle';
      armed = false;
      tracking = true;
    };

    const move = (e: TouchEvent) => {
      if (!tracking) return;
      e.stopPropagation();
      const x = e.touches[0].clientX - sx;
      const y = e.touches[0].clientY - sy;

      if (mode === 'idle') {
        if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { mode = 'v'; return; } // scrolling
        if (x > 10 && x > Math.abs(y) * 1.5) { mode = 'h'; setDragging(true); }   // swipe right = reply
        else if (x < -10) { mode = 'v'; return; }                                  // swipe left: ignore
        else return;
      }
      if (mode !== 'h') return;

      if (e.cancelable) e.preventDefault();
      const pull = Math.max(0, x);
      const eased = pull <= TRIGGER ? pull : TRIGGER + (pull - TRIGGER) * 0.25; // rubber band past the threshold
      setDx(Math.min(eased, MAX));

      const nowArmed = pull >= TRIGGER;
      if (nowArmed && !armed) {
        try { navigator.vibrate?.(12); } catch { /* not supported */ }
      }
      armed = nowArmed;
    };

    const end = (e: TouchEvent) => {
      if (!tracking) return;
      e.stopPropagation();
      const fire = mode === 'h' && armed;
      reset();
      if (fire) cb.current();
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', reset);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', reset);
    };
  }, [disabled]);

  const progress = Math.min(dx / TRIGGER, 1);
  const armedNow = dx >= TRIGGER;

  return (
    <div ref={ref} className={`relative ${className}`} style={{ touchAction: 'pan-y' }}>
      <span
        aria-hidden
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center pointer-events-none transition-colors ${
          armedNow ? 'bg-[#E0533C] text-white' : 'bg-slate-200/80 dark:bg-white/10 text-slate-500 dark:text-slate-300'
        }`}
        style={{ opacity: progress, transform: `translateY(-50%) scale(${0.6 + 0.4 * progress + (armedNow ? 0.1 : 0)})` }}
      >
        <Reply className="w-4 h-4" />
      </span>
      <div
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
