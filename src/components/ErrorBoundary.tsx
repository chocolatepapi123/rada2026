import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retried: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retried: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retried: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[RADA ErrorBoundary caught error]:', error, errorInfo);

    // If it's a dynamic chunk or wake-up glitch, try automatic self-recovery once
    const msg = error?.message || String(error || '');
    const isChunkOrResumeError =
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Loading chunk') ||
      msg.includes('ResizeObserver');

    if (isChunkOrResumeError && !this.state.retried) {
      setTimeout(() => {
        if (this.state.hasError) {
          this.setState({ hasError: false, error: null, retried: true });
        }
      }, 300);
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center mx-auto shadow-md">
              <svg viewBox="0 0 100 130" className="w-8 h-8 fill-none stroke-white" strokeLinejoin="round">
                <path d="M50 6 C26 6 10 26 10 50 C10 76 45 116 48.5 120 C49.3 121 50.7 121 51.5 120 C55 116 90 76 90 50 C90 26 74 6 50 6 Z" strokeWidth="8" />
                <path d="M22 35 C15 45 16 58 25 74 C34 90 46 106 50 112" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="48" r="17" strokeWidth="8" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                {this.props.fallbackTitle || 'Resuming RADA'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The app was paused in the background. Your account, saved spots, and offline data are completely safe.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-[#E0533C] hover:bg-[#c94530] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume App</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Refresh View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
