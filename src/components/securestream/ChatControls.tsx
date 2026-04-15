'use client';

import { ReactNode } from 'react';
import { m } from 'framer-motion';
import { SkipForward, Flag, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatControlsProps {
  onSkip: () => void;
  onReport: () => void;
  onEnd: () => void;
  isSkipping?: boolean;
  children?: ReactNode;
}

export function ChatControls({ onSkip, onReport, onEnd, isSkipping = false, children }: ChatControlsProps) {
  return (
    <div className="w-full">
      {/* Gradient fade from transparent to dark */}
      <div className="bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pt-6 pb-4 px-4 md:px-8">
        <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
          {/* Skip button */}
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSkip}
                  disabled={isSkipping}
                  variant="outline"
                  className="bg-neutral-900/80 backdrop-blur-sm border-neutral-700 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 text-neutral-300 h-12 sm:h-14 px-4 sm:px-6 rounded-xl gap-2 transition-all duration-200 group"
                >
                  <SkipForward className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                  <span className="hidden sm:inline">Skip</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-neutral-200 border-neutral-700">
                Find next partner
              </TooltipContent>
            </Tooltip>
          </m.div>

          {/* End session button */}
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onEnd}
                  variant="outline"
                  className="bg-neutral-900/80 backdrop-blur-sm border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 text-neutral-300 hover:text-white h-12 sm:h-14 px-4 sm:px-6 rounded-xl gap-2 transition-all duration-200 group"
                >
                  <PhoneOff className="w-5 h-5 text-neutral-400 group-hover:text-neutral-200" />
                  <span className="hidden sm:inline">End</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-neutral-200 border-neutral-700">
                End session
              </TooltipContent>
            </Tooltip>
          </m.div>

          {/* Report button */}
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onReport}
                  variant="outline"
                  className="bg-neutral-900/80 backdrop-blur-sm border-neutral-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-neutral-300 h-12 sm:h-14 px-4 sm:px-6 rounded-xl gap-2 transition-all duration-200 group"
                >
                  <Flag className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-neutral-200 border-neutral-700">
                Report partner
              </TooltipContent>
            </Tooltip>
          </m.div>

          {/* Extra controls (mute button, etc.) */}
          {children}
        </div>
      </div>
    </div>
  );
}
