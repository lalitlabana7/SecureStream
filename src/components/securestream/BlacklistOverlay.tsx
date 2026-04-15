'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Ban } from 'lucide-react';

interface BlacklistOverlayProps {
  reason: string;
  expiresAt?: string;
}

export function BlacklistOverlay({ reason, expiresAt }: BlacklistOverlayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateExpiry = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateExpiry();
    const interval = setInterval(updateExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Red accent background */}
      <div className="absolute inset-0 bg-red-950/30 pointer-events-none" />

      {/* Pulsing red border */}
      <m.div
        animate={{
          borderColor: [
            'rgba(239,68,68,0.1)',
            'rgba(239,68,68,0.3)',
            'rgba(239,68,68,0.1)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-4 md:inset-12 border-2 rounded-3xl pointer-events-none"
      />

      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 relative z-10 max-w-md"
      >
        {/* Ban icon */}
        <m.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center"
        >
          <Ban className="w-10 h-10 text-red-400" />
        </m.div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center">
          Session Suspended
        </h2>

        {/* Reason */}
        <p className="text-red-400/80 text-center text-sm md:text-base bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {reason}
        </p>

        {/* Expiry time */}
        {expiresAt && timeLeft && (
          <div className="text-center">
            <p className="text-neutral-500 text-sm mb-1">Suspension ends in:</p>
            <m.p
              key={timeLeft}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold text-white font-mono"
            >
              {timeLeft}
            </m.p>
          </div>
        )}

        {/* Info message */}
        <p className="text-neutral-600 text-xs text-center mt-4">
          Your account has been temporarily suspended due to policy violations.
          Please review our community guidelines.
        </p>
      </m.div>
    </div>
  );
}
