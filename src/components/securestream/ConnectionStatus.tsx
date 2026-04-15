'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  state: string;
}

const stateConfig: Record<string, { label: string; color: string; animate: string }> = {
  connected: {
    label: 'Connected',
    color: 'bg-emerald-500',
    animate: '',
  },
  connecting: {
    label: 'Connecting...',
    color: 'bg-yellow-500',
    animate: 'animate-pulse',
  },
  disconnected: {
    label: 'Disconnected',
    color: 'bg-red-500',
    animate: '',
  },
  reconnecting: {
    label: 'Reconnecting...',
    color: 'bg-yellow-500',
    animate: 'animate-ping',
  },
  failed: {
    label: 'Connection Failed',
    color: 'bg-red-500',
    animate: '',
  },
  new: {
    label: 'Connecting...',
    color: 'bg-neutral-500',
    animate: 'animate-pulse',
  },
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = stateConfig[state] || stateConfig.new;

  return (
    <m.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute top-3 right-3 z-20"
    >
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
        <div className="relative">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              config.color
            )}
          />
          {config.animate === 'animate-ping' && (
            <div
              className={cn(
                'absolute inset-0 w-2 h-2 rounded-full',
                config.color,
                'animate-ping'
              )}
            />
          )}
          {config.animate === 'animate-pulse' && (
            <m.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                'absolute inset-0 w-2 h-2 rounded-full',
                config.color
              )}
            />
          )}
        </div>
        <span className="text-white/80 text-xs font-medium">{config.label}</span>
      </div>
    </m.div>
  );
}
