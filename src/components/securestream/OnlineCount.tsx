'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OnlineCountProps {
  count: number;
}

export function OnlineCount({ count }: OnlineCountProps) {
  return (
    <Badge
      variant="outline"
      className="border-neutral-700 text-neutral-400 bg-neutral-900/80 backdrop-blur-sm px-2.5 py-1 text-xs gap-1.5 h-7 rounded-lg"
    >
      <Users className="w-3 h-3 text-emerald-400" />
      {count} online
    </Badge>
  );
}
