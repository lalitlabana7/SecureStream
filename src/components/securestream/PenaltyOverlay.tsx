'use client';

import { useEffect, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PenaltyOverlayProps {
  cooldownSeconds: number;
  onComplete: () => void;
}

export function PenaltyOverlay({ cooldownSeconds, onComplete }: PenaltyOverlayProps) {
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    setRemaining(cooldownSeconds);
  }, [cooldownSeconds]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (remaining <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, handleComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((cooldownSeconds - remaining) / cooldownSeconds) * 100;

  // Circle animation parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Red-tinted background */}
      <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />

      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 relative z-10"
      >
        {/* Warning icon */}
        <m.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center"
        >
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </m.div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Slow Down!
        </h2>

        {/* Subtitle */}
        <p className="text-neutral-400 text-center max-w-sm">
          You&apos;re skipping too fast. Please wait before finding a new partner.
        </p>

        {/* Countdown ring */}
        <div className="relative w-44 h-44 my-4">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-neutral-800"
            />
            <m.circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-red-500"
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white font-mono">
              {formatTime(remaining)}
            </span>
            <span className="text-neutral-500 text-xs mt-1">remaining</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 md:w-80">
          <Progress value={progress} className="h-2 bg-neutral-800 [&>div]:bg-red-500" />
        </div>
      </m.div>
    </div>
  );
}
