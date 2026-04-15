'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  startTime: number | null;
}

export function SessionTimer({ startTime }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!startTime) return;

    const update = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime || !elapsed) return null;

  return (
    <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
      <Clock className="w-3 h-3" />
      <span>{elapsed}</span>
    </div>
  );
}
