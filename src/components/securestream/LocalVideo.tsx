'use client';

import { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocalVideoProps {
  stream: MediaStream | null;
  isMuted: boolean;
  isCameraOff?: boolean;
  onToggleMute: () => void;
  onToggleCamera?: () => void;
}

export function LocalVideo({ stream, isMuted, isCameraOff = false, onToggleMute, onToggleCamera }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleToggleCamera = () => {
    if (onToggleCamera && stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      onToggleCamera();
    }
  };

  return (
    <div className="group relative rounded-xl overflow-hidden shadow-lg shadow-black/50 border border-neutral-700/50 transition-colors duration-300">
      {/* Video element */}
      <div className="relative w-[160px] h-[120px] sm:w-[200px] sm:h-[150px] bg-neutral-900">
        {stream && !isCameraOff ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <VideoOff className="w-8 h-8 text-neutral-600" />
          </div>
        )}

        {/* Hover controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={onToggleMute}
            className={cn(
              'p-2 rounded-full transition-colors',
              isMuted
                ? 'bg-red-500/80 text-white hover:bg-red-500'
                : 'bg-white/20 text-white hover:bg-white/30'
            )}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          {onToggleCamera && (
            <button
              onClick={handleToggleCamera}
              className={cn(
                'p-2 rounded-full transition-colors',
                isCameraOff
                  ? 'bg-red-500/80 text-white hover:bg-red-500'
                  : 'bg-white/20 text-white hover:bg-white/30'
              )}
              aria-label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* "You" label */}
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md">
        You
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <div className="absolute top-1.5 right-1.5 bg-red-500 rounded-full p-1">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Green border glow when stream is active */}
      {stream && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-emerald-500/30 pointer-events-none" />
      )}
    </div>
  );
}
