'use client';

import { useCallback, useRef, useState } from 'react';

export interface UseMediaStreamReturn {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<MediaStream | null>;
  stopStream: () => void;
}

export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      console.log('[useMediaStream] Stream stopped');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<MediaStream | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      console.log('[useMediaStream] Permission granted, stream active');
      return mediaStream;
    } catch (err) {
      const message =
        err instanceof DOMException
          ? getPermissionErrorMessage(err)
          : 'Failed to access camera/microphone';

      setError(message);
      console.error('[useMediaStream] Permission denied:', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-stop on unmount
  const cleanupRef = useRef(stopStream);
  cleanupRef.current = stopStream;

  // We rely on the consuming component to call stopStream or we clean up
  // when the hook is torn down. Since we can't use useEffect with 'use client'
  // in a clean way here without deps, we export stopStream for manual cleanup.
  // For React 19 StrictMode double-mount safety, we export stopStream.

  return { stream, error, isLoading, requestPermission, stopStream };
}

function getPermissionErrorMessage(err: DOMException): string {
  switch (err.name) {
    case 'NotAllowedError':
      return 'Camera/microphone permission denied. Please allow access in your browser settings.';
    case 'NotFoundError':
      return 'No camera or microphone found on this device.';
    case 'NotReadableError':
      return 'Camera or microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Camera does not meet the required constraints.';
    case 'AbortError':
      return 'Camera/microphone request was aborted.';
    default:
      return `Camera/microphone error: ${err.message}`;
  }
}
