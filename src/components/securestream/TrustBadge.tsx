'use client';

import { Shield } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  score: number;
  change?: number;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (score >= 40) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  return 'text-red-400 border-red-500/30 bg-red-500/10';
}

function getChangeText(change: number): string {
  if (change > 0) return `+${change} (clean disconnect)`;
  if (change < 0) return `${change} (violation)`;
  return 'No change';
}

export function TrustBadge({ score, change }: TrustBadgeProps) {
  const colorClass = getScoreColor(score);

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
        colorClass
      )}
    >
      <Shield className="w-3.5 h-3.5" />
      <span>Trust: {score}</span>
      {change !== undefined && change !== 0 && (
        <span className={cn('text-xs ml-1', change > 0 ? 'text-emerald-400' : 'text-red-400')}>
          ({change > 0 ? '+' : ''}{change})
        </span>
      )}
    </div>
  );

  if (change !== undefined && change !== 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-neutral-200 border-neutral-700">
          {getChangeText(change)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
