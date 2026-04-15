'use client';

import { m } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchQueueProps {
  position: number;
  estimatedWait: number;
  onCancel: () => void;
}

export function MatchQueue({ position, estimatedWait, onCancel }: MatchQueueProps) {
  const formatWait = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 relative">
      {/* Pulsing green border background */}
      <m.div
        animate={{
          borderColor: [
            'rgba(16,185,129,0.1)',
            'rgba(16,185,129,0.4)',
            'rgba(16,185,129,0.1)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-4 md:inset-12 border-2 rounded-3xl pointer-events-none"
      />

      {/* Radar / scanning animation */}
      <div className="relative w-40 h-40 md:w-52 md:h-52 mb-10">
        {/* Outer ring */}
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-emerald-500/20"
        />
        {/* Middle ring */}
        <m.div
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-6 rounded-full border border-emerald-500/30"
        />
        {/* Inner ring */}
        <div className="absolute inset-12 rounded-full border border-emerald-500/40" />
        {/* Scanning line */}
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-1/2 h-px bg-gradient-to-r from-emerald-500 to-transparent origin-left" />
        </m.div>
        {/* Center dot */}
        <m.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500"
        />
        {/* Search icon */}
        <Search className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-400/80" />
      </div>

      {/* Searching text */}
      <m.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-xl md:text-2xl font-semibold text-white mb-6"
      >
        Searching for a partner
        <m.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
        >
          ...
        </m.span>
      </m.div>

      {/* Queue info */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-3 text-center">
          <p className="text-neutral-500 text-sm">Queue Position</p>
          <p className="text-2xl font-bold text-white">
            #{position}
          </p>
        </div>
        <div className="bg-neutral-900/50 rounded-lg px-4 py-2 text-center">
          <p className="text-neutral-500 text-xs">
            Estimated wait: <span className="text-neutral-300">{formatWait(estimatedWait)}</span>
          </p>
        </div>
      </div>

      {/* Cancel button */}
      <Button
        onClick={onCancel}
        variant="ghost"
        className="text-neutral-400 hover:text-white hover:bg-neutral-800 gap-2"
      >
        <X className="w-4 h-4" />
        Cancel
      </Button>
    </div>
  );
}
