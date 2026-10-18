import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle, RotateCcw, X, Film } from 'lucide-react';
import { formatMediaDuration } from '../utils/mediaUtils.ts';

interface VideoMessagePlayerProps {
  videoUrl: string;
  isCircular?: boolean;
  videoDuration?: number;
  isMyMessage?: boolean;
  time?: string;
  replyTo?: {
    sender: string;
    text: string;
  };
}

export const VideoMessagePlayer: React.FC<VideoMessagePlayerProps> = ({
  videoUrl,
  isCircular = false,
  videoDuration = 6,
  isMyMessage = false,
  time,
  replyTo
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(videoDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoDuration && videoDuration > 0) {
      setDuration(videoDuration);
    }
  }, [videoDuration]);

  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoUrl]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (hasError) {
      handleRetry();
      return;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Video playback error:', err);
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && !isNaN(videoRef.current.duration) && isFinite(videoRef.current.duration)) {
      setDuration(Math.max(1, Math.round(videoRef.current.duration)));
    }
    setHasError(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const handleRetry = () => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleOpenFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullModal(true);
  };

  // Circular video progress calculations
  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const strokeDashoffset = 100 - progressRatio * 100;

  if (hasError) {
    return (
      <div className="flex flex-col items-center">
        {replyTo && (
          <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1 max-w-[240px]">
            <span className="font-bold opacity-80 block">{replyTo.sender}</span>
            <p className="truncate opacity-75">{replyTo.text}</p>
          </div>
        )}
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-2xl max-w-[240px] text-xs space-y-2 text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-bold text-[11px]">Video message unavailable</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Unable to stream this media attachment.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry Loading</span>
          </button>
        </div>
        {time && <span className="text-[9px] opacity-70 mt-1">{time}</span>}
      </div>
    );
  }

  /* 1. Circular Video Note (Telegram / WhatsApp Style) */
  if (isCircular) {
    return (
      <div className="relative flex flex-col items-center">
        {replyTo && (
          <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1 max-w-[200px]">
            <span className="font-bold opacity-80 block">{replyTo.sender}</span>
            <p className="truncate opacity-75">{replyTo.text}</p>
          </div>
        )}

        <div
          onClick={handleTogglePlay}
          className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-[#E0533C] shadow-xl bg-black group select-none cursor-pointer"
          title={isPlaying ? 'Pause video note' : 'Play video note'}
        >
          {/* Real video tag */}
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted={isMuted}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
            className="w-full h-full object-cover pointer-events-none"
          />

          {/* SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#E0533C"
              strokeWidth="4"
              strokeDasharray="289.02"
              strokeDashoffset={289.02 * (1 - progressRatio)}
              className="transition-all duration-150"
            />
          </svg>

          {/* Center Play/Pause button */}
          <div className={`absolute inset-0 bg-black/35 flex items-center justify-center transition-opacity duration-200 ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}>
            <div className="w-10 h-10 rounded-full bg-[#E0533C]/90 text-white flex items-center justify-center shadow-lg">
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </div>
          </div>

          {/* Corner Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition shadow-xs z-10"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Expansion Button */}
          <button
            type="button"
            onClick={handleOpenFullscreen}
            className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition shadow-xs z-10"
            title="Open Fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Bottom Duration Badge */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow pointer-events-none">
            {isPlaying
              ? `${formatMediaDuration(currentTime)} / ${formatMediaDuration(duration)}`
              : formatMediaDuration(duration)}
          </div>
        </div>

        {time && <span className="text-[9px] opacity-70 mt-1">{time}</span>}

        {/* Fullscreen Video Modal */}
        {showFullModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowFullModal(false)}
          >
            <div 
              className="relative max-w-sm w-full bg-[#1C1A1E] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-4 flex flex-col items-center space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
                <span className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-[#E0533C]" />
                  <span>Circular Video Note</span>
                </span>
                <button
                  onClick={() => setShowFullModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-[#E0533C] shadow-2xl bg-black relative">
                <video
                  ref={modalVideoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Duration: {formatMediaDuration(duration)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 2. Rectangular Video Message Card */
  return (
    <div className="space-y-1.5 max-w-[280px] w-full">
      {replyTo && (
        <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1">
          <span className="font-bold opacity-80 block">{replyTo.sender}</span>
          <p className="truncate opacity-75">{replyTo.text}</p>
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black shadow-md aspect-video group">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          controls
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          className="w-full h-full object-cover"
        />
      </div>

      {time && (
        <span className="text-[9px] opacity-70 block text-right">
          {time}
        </span>
      )}
    </div>
  );
};
