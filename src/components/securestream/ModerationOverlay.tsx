'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ModerationOverlayProps {
  isBlurred: boolean;
  isWarning: boolean;
  warningText?: string;
}

export function ModerationOverlay({
  isBlurred,
  isWarning,
  warningText = 'Content warning: Inappropriate content detected',
}: ModerationOverlayProps) {
  return (
    <>
      {/* Blur overlay */}
      <AnimatePresence>
        {isBlurred && (
          <m.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-neutral-950/70 z-20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Warning banner */}
      <AnimatePresence>
        {isWarning && (
          <WarningBanner warningText={warningText} />
        )}
      </AnimatePresence>
    </>
  );
}

// Separate component manages its own auto-dismiss via mount timer
function WarningBanner({ warningText }: { warningText: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="absolute top-0 left-0 right-0 z-30"
    >
      <div className="bg-amber-600/90 backdrop-blur-sm border-b border-amber-500/50 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-white shrink-0" />
        <p className="text-white text-sm font-medium">
          ⚠️ {warningText}
        </p>
      </div>
    </m.div>
  );
}
