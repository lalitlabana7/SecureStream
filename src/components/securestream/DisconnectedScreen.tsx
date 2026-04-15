'use client';

import { m } from 'framer-motion';
import { UserMinus, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DisconnectReason } from '@/types/securestream';

interface DisconnectedScreenProps {
  reason: DisconnectReason;
  trustChange?: number;
  newScore?: number;
  onFindNext: () => void;
  onGoHome: () => void;
}

const reasonMessages: Record<DisconnectReason, { title: string; subtitle: string }> = {
  skip: {
    title: 'You skipped your partner',
    subtitle: 'Looking for someone new?',
  },
  disconnect: {
    title: 'Your partner disconnected',
    subtitle: 'They left the conversation.',
  },
  violation: {
    title: 'Session ended due to policy violation',
    subtitle: 'Inappropriate content was detected.',
  },
  timeout: {
    title: 'Session timed out',
    subtitle: 'The connection was lost due to inactivity.',
  },
  moderation_kill: {
    title: 'Session terminated by moderation',
    subtitle: 'AI moderation ended this session.',
  },
  ice_failure: {
    title: 'Connection failed',
    subtitle: 'Unable to establish a peer connection.',
  },
  permission_denied: {
    title: 'Permission denied',
    subtitle: 'Camera access is required to use SecureStream.',
  },
};

export function DisconnectedScreen({
  reason,
  trustChange,
  newScore,
  onFindNext,
  onGoHome,
}: DisconnectedScreenProps) {
  const { title, subtitle } = reasonMessages[reason] || reasonMessages.disconnect;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <UserMinus className="w-8 h-8 text-neutral-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="text-neutral-400 text-sm text-center">
          {subtitle}
        </p>

        {/* Trust score change */}
        {trustChange !== undefined && newScore !== undefined && (
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center"
          >
            <p className="text-xs text-neutral-500 mb-1">Trust Score</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-neutral-400 text-lg line-through">{newScore - trustChange}</span>
              <ArrowRight className="w-4 h-4 text-neutral-600" />
              <span className={`text-lg font-bold ${
                trustChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {newScore}
              </span>
              <span className={`text-sm ${
                trustChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                ({trustChange >= 0 ? '+' : ''}{trustChange})
              </span>
            </div>
          </m.div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <Button
            onClick={onFindNext}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Find Next
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white h-12 rounded-xl transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </m.div>
    </div>
  );
}
