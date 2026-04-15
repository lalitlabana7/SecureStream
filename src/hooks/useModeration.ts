'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { HEARTBEAT_INTERVAL_MS, FRAME_WIDTH, FRAME_HEIGHT, FRAME_QUALITY } from '@/lib/constants';
import type { ModerationAnalysis, ModerationResponse, RiskLevel } from '@/types/securestream';

export interface UseModerationReturn {
  lastResult: ModerationAnalysis | null;
  isAnalyzing: boolean;
  isHighRisk: boolean;
  warningCount: number;
  startHeartbeat: (
    videoRef: RefObject<HTMLVideoElement | null>,
    sessionId: string,
    roomId: string,
  ) => void;
  stopHeartbeat: () => void;
  setOnHighRisk: (callback: ((analysis: ModerationAnalysis) => void) | null) => void;
}

const RISK_ORDER: Record<RiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Reusable canvas for frame capture (avoids creating a new canvas every 2 seconds)
let captureCanvas: HTMLCanvasElement | null = null;
let captureCtx: CanvasRenderingContext2D | null = null;

function captureFrame(video: HTMLVideoElement): string {
  if (!captureCanvas) {
    captureCanvas = document.createElement('canvas');
    captureCanvas.width = FRAME_WIDTH;
    captureCanvas.height = FRAME_HEIGHT;
    captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!captureCtx) return '';

  captureCtx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  return captureCanvas.toDataURL('image/jpeg', FRAME_QUALITY);
}

/** Cleanup reusable moderation canvas resources */
export function cleanupModerationResources() {
  if (captureCanvas) {
    captureCanvas = null;
    captureCtx = null;
  }
}

export function useModeration(): UseModerationReturn {
  const [lastResult, setLastResult] = useState<ModerationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionIdRef = useRef<string>('');
  const roomIdRef = useRef<string>('');
  const onHighRiskRef = useRef<((analysis: ModerationAnalysis) => void) | null>(null);

  const isHighRisk = lastResult?.high_risk ?? false;

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    const sessionId = sessionIdRef.current;
    const roomId = roomIdRef.current;

    if (!video || !sessionId || !roomId) return;

    // Don't overlap requests
    if (isAnalyzing) return;

    // Skip if video isn't playing
    if (video.readyState < 2) return;

    try {
      setIsAnalyzing(true);
      const frame = captureFrame(video);

      const response = await fetch('/api/moderation?XTransformPort=3004', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          roomId,
          frame,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.warn('[useModeration] Moderation request failed:', response.status);
        return;
      }

      const data: ModerationResponse = await response.json();

      if (data.analysis) {
        setLastResult(data.analysis);

        // Increment warning count for medium+ risk
        const riskLevel = data.analysis.risk_level;
        if (RISK_ORDER[riskLevel] >= RISK_ORDER['medium']) {
          setWarningCount((prev) => prev + 1);
        } else {
          // Reset warning count on clean frames
          setWarningCount(0);
        }

        // Trigger kill-switch callback on high risk
        if (data.analysis.high_risk && onHighRiskRef.current) {
          console.warn('[useModeration] High risk detected — triggering kill-switch');
          onHighRiskRef.current(data.analysis);
        }
      }
    } catch (err) {
      console.error('[useModeration] Frame analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const startHeartbeat = useCallback(
    (
      video: RefObject<HTMLVideoElement | null>,
      sessionId: string,
      roomId: string,
    ) => {
      stopHeartbeat();

      videoRef.current = video.current;
      sessionIdRef.current = sessionId;
      roomIdRef.current = roomId;
      setWarningCount(0);
      setLastResult(null);

      console.log('[useModeration] Heartbeat started');

      // Analyze immediately, then on interval
      analyzeFrame();
      intervalRef.current = setInterval(analyzeFrame, HEARTBEAT_INTERVAL_MS);
    },
    [analyzeFrame],
  );

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[useModeration] Heartbeat stopped');
    }
  }, []);

  const setOnHighRisk = useCallback(
    (callback: ((analysis: ModerationAnalysis) => void) | null) => {
      onHighRiskRef.current = callback;
    },
    [],
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    lastResult,
    isAnalyzing,
    isHighRisk,
    warningCount,
    startHeartbeat,
    stopHeartbeat,
    setOnHighRisk,
  };
}
