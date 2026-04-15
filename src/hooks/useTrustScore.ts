'use client';

import { useState, useCallback } from 'react';
import { TRUST_DEFAULT_SCORE, TRUST_MAX_SCORE, TRUST_MIN_SCORE } from '@/lib/constants';

export interface UseTrustScoreReturn {
  score: number;
  change: number;
  updateScore: (newScore: number, delta: number) => void;
  resetScore: () => void;
}

export function useTrustScore(): UseTrustScoreReturn {
  const [score, setScore] = useState<number>(TRUST_DEFAULT_SCORE);
  const [change, setChange] = useState<number>(0);

  const updateScore = useCallback((newScore: number, delta: number) => {
    // Clamp between min and max
    const clamped = Math.max(TRUST_MIN_SCORE, Math.min(TRUST_MAX_SCORE, newScore));
    setScore(clamped);
    setChange(delta);
    console.log(`[useTrustScore] Score updated: ${clamped} (Δ${delta >= 0 ? '+' : ''}${delta})`);
  }, []);

  const resetScore = useCallback(() => {
    setScore(TRUST_DEFAULT_SCORE);
    setChange(0);
    console.log('[useTrustScore] Score reset to default');
  }, []);

  return { score, change, updateScore, resetScore };
}
