import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, AlertCircle, RotateCcw, Volume2 } from 'lucide-react';
import { formatMediaDuration } from '../utils/mediaUtils.ts';

interface AudioMessagePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  isMyMessage: boolean;
  time?: string;
  replyTo?: {
    sender: string;
    text: string;
  };
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  durationSeconds = 12,
  isMyMessage,
  time,
  replyTo
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(durationSeconds);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize duration if prop changes
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  // When audioUrl changes, reset states
  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (hasError) {
      handleRetry();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err) {
        console.warn('Audio playback error:', err);
        setHasError(true);
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setDuration(Math.max(1, Math.round(audioRef.current.duration)));
    }
    setHasError(false);
    setIsLoading(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setHasError(true);
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLElement>, barIndex: number, totalBars: number) => {
    e.stopPropagation();
    if (!audioRef.current || hasError) return;
    const seekFraction = (barIndex + 1) / totalBars;
    const targetTime = seekFraction * (duration || durationSeconds);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  // Fixed sample waveform heights for rhythmic authentic look
  const waveformHeights = [4, 8, 14, 9, 18, 12, 6, 16, 10, 14, 8, 12, 16, 5, 11, 15, 9, 7];
  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const activeBarsCount = Math.round(progressRatio * waveformHeights.length);

  return (
    <div className="space-y-1.5 w-full min-w-[210px] max-w-[280px]">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />

      {replyTo && (
        <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1">
          <span className="font-bold opacity-80 block">{replyTo.sender}</span>
          <p className="truncate opacity-75">{replyTo.text}</p>
        </div>
      )}

      {hasError ? (
        /* Fallback Error State: Clean, inline, never crashes container */
        <div className="flex items-center justify-between gap-2 p-2 bg-black/25 rounded-xl border border-white/20 text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-[11px] block leading-tight">Audio unavailable</span>
              <span className="text-[9px] opacity-75 block">Tap retry to reload</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        /* Normal Audio Waveform & Player */
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer ${
              isMyMessage 
                ? 'bg-white text-[#E0533C] dark:text-[#D17A68] hover:bg-white/90' 
                : 'bg-[#E0533C] dark:bg-[#A94F3E] text-white hover:bg-orange-700'
            }`}
            title={isPlaying ? 'Pause voice note' : 'Play voice note'}
            aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          {/* Interactive Scrubbable Waveform */}
          <div 
            className="flex-1 flex items-center gap-0.5 h-6 cursor-pointer py-1"
            title="Click along waveform to jump"
          >
            {waveformHeights.map((h, idx) => {
              const isPassed = idx <= activeBarsCount;
              return (
                <span
                  key={idx}
                  onClick={(e) => handleSeek(e, idx, waveformHeights.length)}
                  className={`flex-1 rounded-full transition-all duration-150 hover:opacity-100 ${
                    isPassed
                      ? isMyMessage ? 'bg-white' : 'bg-[#E0533C] dark:bg-[#A94F3E]'
                      : isMyMessage ? 'bg-white/40' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  style={{ height: `${h}px`, minWidth: '2px' }}
                />
              );
            })}
          </div>

          {/* Functional Duration Timer */}
          <div className="text-[10px] font-mono font-bold shrink-0 min-w-[36px] text-right opacity-90">
            {isPlaying
              ? formatMediaDuration(currentTime)
              : formatMediaDuration(duration)}
          </div>
        </div>
      )}

      {/* Timestamp footer */}
      {time && (
        <span className="text-[9px] opacity-70 block text-right">
          {time}
        </span>
      )}
    </div>
  );
};
