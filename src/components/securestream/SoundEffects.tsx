'use client';

import { useCallback, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SoundType = 'match' | 'disconnect' | 'message' | 'warning';

const SOUND_CONFIGS: Record<SoundType, { frequencies: number[]; duration: number; waveform: OscillatorType }> = {
  match: { frequencies: [523.25, 659.25], duration: 0.15, waveform: 'sine' },
  disconnect: { frequencies: [440], duration: 0.3, waveform: 'sine' },
  message: { frequencies: [880], duration: 0.08, waveform: 'sine' },
  warning: { frequencies: [220, 220], duration: 0.1, waveform: 'square' },
};

function getAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function getInitialMutedState(): boolean {
  try {
    return localStorage.getItem('securestream-muted') === 'true';
  } catch {
    return false;
  }
}

export function useSoundEffects() {
  const contextRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(getInitialMutedState);

  const playSound = useCallback((type: SoundType) => {
    const ctx = contextRef.current || getAudioContext();
    if (!ctx) return;
    contextRef.current = ctx;

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const config = SOUND_CONFIGS[type];
    const now = ctx.currentTime;

    config.frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.waveform;
      oscillator.frequency.setValueAtTime(freq, now);

      const startTime = now + i * config.duration;
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration + 0.05);
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('securestream-muted', String(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }, []);

  const MuteButton = useCallback(() => (
    <MuteButtonInner isMuted={isMuted} onToggle={toggleMute} />
  ), [isMuted, toggleMute]);

  return { playSound, isMuted, toggleMute, MuteButton };
}

function MuteButtonInner({ isMuted, onToggle }: { isMuted: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-neutral-900/80 backdrop-blur-sm border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 h-12 sm:h-14 px-4 sm:px-6 rounded-xl gap-2 transition-all duration-200"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Sound'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-neutral-800 text-neutral-200 border-neutral-700">
        {isMuted ? 'Unmute notifications' : 'Mute notifications'}
      </TooltipContent>
    </Tooltip>
  );
}
