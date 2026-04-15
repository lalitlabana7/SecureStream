'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RemoteVideoProps {
  stream: MediaStream | null;
  isBlurred: boolean;
  connectionState: string;
}

export interface RemoteVideoHandle {
  getVideoElement: () => HTMLVideoElement | null;
}

const borderColors: Record<string, string> = {
  connected: 'ring-emerald-500/40',
  connecting: 'ring-yellow-500/40',
  disconnected: 'ring-red-500/40',
  reconnecting: 'ring-yellow-500/40',
  failed: 'ring-red-500/40',
  new: 'ring-neutral-700/40',
};

const glowColors: Record<string, string> = {
  connected: 'shadow-emerald-500/10',
  connecting: 'shadow-yellow-500/10',
  disconnected: 'shadow-red-500/10',
  reconnecting: 'shadow-yellow-500/10',
  failed: 'shadow-red-500/10',
  new: 'shadow-black/20',
};

export const RemoteVideo = forwardRef<RemoteVideoHandle, RemoteVideoProps>(
  function RemoteVideo({ stream, isBlurred, connectionState }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose the video element to parent via ref
    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
    }));

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    const borderColor = borderColors[connectionState] || borderColors.new;
    const glowColor = glowColors[connectionState] || glowColors.new;

    return (
      <div
        className={cn(
          'relative w-full aspect-video bg-neutral-900 rounded-2xl overflow-hidden ring-2 transition-all duration-500 shadow-2xl',
          borderColor,
          glowColor,
        )}
      >
        {/* Video stream */}
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Placeholder / connecting state */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            {/* Shimmer animation */}
            <div className="relative">
              <m.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [0.95, 1, 0.95],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center"
              >
                <User className="w-8 h-8 text-neutral-500" />
              </m.div>
            </div>
            <p className="text-neutral-500 text-sm">Connecting to partner...</p>
            {/* Shimmer bar */}
            <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <m.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
              />
            </div>
          </div>
        )}

        {/* Partner label */}
        <AnimatePresence>
          {stream && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg"
            >
              <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center">
                <User className="w-3 h-3 text-neutral-400" />
              </div>
              Stranger
            </m.div>
          )}
        </AnimatePresence>

        {/* Blur overlay */}
        <AnimatePresence>
          {isBlurred && stream && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xl z-10"
            />
          )}
        </AnimatePresence>
      </div>
    );
  },
);
