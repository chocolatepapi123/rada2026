import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  Bookmark,
  Star,
  ShieldCheck,
  Mic,
  Video,
  AlertCircle,
  Info,
  Sparkles,
  X
} from 'lucide-react';

export type ToastType =
  | 'success'
  | 'bookmark'
  | 'review'
  | 'verified'
  | 'audio'
  | 'video'
  | 'error'
  | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: 'top' | 'bottom';
  icon?: React.ReactNode;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  position: 'top' | 'bottom';
  customIcon?: React.ReactNode;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastListener = (message: string, options?: ToastOptions) => void;
type HideListener = () => void;

let globalShowToast: ToastListener | null = null;
let globalHideToast: HideListener | null = null;

/**
 * Direct standalone function callable anywhere across RADA components
 */
export const showToast = (message: string, options?: ToastOptions) => {
  if (globalShowToast) {
    globalShowToast(message, options);
  } else {
    console.info('[RADA Toast]', message);
  }
};

export const hideToast = () => {
  if (globalHideToast) {
    globalHideToast();
  }
};

/**
 * Automatically determine the best icon & style based on the toast message keywords
 */
function resolveToastType(message: string, explicitType?: ToastType): ToastType {
  if (explicitType) return explicitType;
  const lower = message.toLowerCase();

  if (lower.includes('vault') || lower.includes('saved') || lower.includes('plan')) {
    return 'bookmark';
  }
  if (lower.includes('review') || lower.includes('star') || lower.includes('rating')) {
    return 'review';
  }
  if (lower.includes('verif') || lower.includes('liveness') || lower.includes('shield')) {
    return 'verified';
  }
  if (lower.includes('voice') || lower.includes('audio') || lower.includes('mic')) {
    return 'audio';
  }
  if (lower.includes('video')) {
    return 'video';
  }
  if (lower.includes('error') || lower.includes('denied') || lower.includes('failed') || lower.includes('required')) {
    return 'error';
  }
  if (lower.includes('removed') || lower.includes('deleted') || lower.includes('passed') || lower.includes('signed out')) {
    return 'info';
  }
  return 'success';
}

function getToastIcon(type: ToastType, customIcon?: React.ReactNode) {
  if (customIcon) return customIcon;
  switch (type) {
    case 'bookmark':
      return <Bookmark className="w-4 h-4 text-[#E0533C] fill-[#E0533C] shrink-0" />;
    case 'review':
      return <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />;
    case 'verified':
      return <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'audio':
      return <Mic className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'video':
      return <Video className="w-4 h-4 text-blue-400 shrink-0" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    case 'info':
      return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'success':
    default:
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (exitAnimationTimerRef.current) clearTimeout(exitAnimationTimerRef.current);
    dismissTimerRef.current = null;
    exitAnimationTimerRef.current = null;
  }, []);

  const hideToastInternal = useCallback(() => {
    clearTimers();
    setIsExiting(true);
    exitAnimationTimerRef.current = setTimeout(() => {
      setCurrentToast(null);
      setIsExiting(false);
    }, 280);
  }, [clearTimers]);

  const showToastInternal = useCallback((message: string, options?: ToastOptions) => {
    if (!message || typeof message !== 'string') return;
    clearTimers();

    const duration = options?.duration || 2500; // Standard 2.5s auto-dismiss
    const type = resolveToastType(message, options?.type);
    const position = options?.position || 'top'; // Top-center so it never covers bottom nav or chat input

    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message,
      type,
      duration,
      position,
      customIcon: options?.icon
    };

    setIsExiting(false);
    setCurrentToast(newToast);

    // Trigger smooth fade-out slide 280ms before final unmount
    const fadeOutDelay = Math.max(800, duration - 280);
    exitAnimationTimerRef.current = setTimeout(() => {
      setIsExiting(true);
    }, fadeOutDelay);

    dismissTimerRef.current = setTimeout(() => {
      setCurrentToast(null);
      setIsExiting(false);
    }, duration);
  }, [clearTimers]);

  useEffect(() => {
    globalShowToast = showToastInternal;
    globalHideToast = hideToastInternal;
    return () => {
      globalShowToast = null;
      globalHideToast = null;
      clearTimers();
    };
  }, [showToastInternal, hideToastInternal, clearTimers]);

  return (
    <ToastContext.Provider value={{ showToast: showToastInternal, hideToast: hideToastInternal }}>
      {children}
      {currentToast && (
        <aside
          role="status"
          aria-live="polite"
          aria-atomic="true"
          onClick={hideToastInternal}
          className={`fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto max-w-[92vw] sm:max-w-md w-auto select-none cursor-pointer transition-all duration-300 ease-out ${
            currentToast.position === 'bottom'
              ? 'bottom-20 sm:bottom-24'
              : 'top-5 sm:top-6'
          } ${
            isExiting
              ? currentToast.position === 'bottom'
                ? 'opacity-0 translate-y-3 scale-95'
                : 'opacity-0 -translate-y-3 scale-95'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          {/* Dark translucent glassmorphism theme container */}
          <div className="bg-slate-900/90 backdrop-blur-md text-white border border-white/10 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <span className="flex items-center justify-center p-1 rounded-xl bg-white/5 border border-white/5 shrink-0">
              {getToastIcon(currentToast.type, currentToast.customIcon)}
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-100 leading-snug break-words">
              {currentToast.message}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hideToastInternal();
              }}
              className="ml-auto p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast,
      hideToast
    };
  }
  return context;
};
