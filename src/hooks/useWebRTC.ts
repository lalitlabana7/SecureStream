'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ICE_RESTART_MAX_ATTEMPTS } from '@/lib/constants';
import { WEBRTC_CONFIG, SDP_OFFER_OPTIONS } from '@/lib/webrtc-config';

export interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  createPeerConnection: () => RTCPeerConnection;
  setLocalStream: (stream: MediaStream) => void;
  createOffer: () => Promise<string>;
  handleOffer: (sdp: string) => Promise<string>;
  handleAnswer: (sdp: string) => void;
  addIceCandidate: (candidate: RTCIceCandidateInit) => void;
  restartIce: () => Promise<void>;
  close: () => void;
}

export function useWebRTC(): UseWebRTCReturn {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceRestartAttemptsRef = useRef(0);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');

  const createPeerConnection = useCallback(() => {
    // Clean up existing connection if any
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    pcRef.current = pc;
    iceRestartAttemptsRef.current = 0;

    // Track remote stream when partner's tracks arrive
    pc.ontrack = (event: RTCTrackEvent) => {
      console.log('[useWebRTC] Remote track received:', event.track.kind);
      const remote = event.streams[0] ?? new MediaStream();
      if (event.track) {
        remote.addTrack(event.track);
      }
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    // Monitor ICE connection state for auto-restart
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setIceConnectionState(state);
      console.log('[useWebRTC] ICE connection state:', state);

      if (state === 'failed' || state === 'disconnected') {
        if (iceRestartAttemptsRef.current < ICE_RESTART_MAX_ATTEMPTS) {
          console.log(
            `[useWebRTC] ICE ${state} — attempting restart (${iceRestartAttemptsRef.current + 1}/${ICE_RESTART_MAX_ATTEMPTS})`,
          );
          pc.restartIce();
          iceRestartAttemptsRef.current += 1;
        } else {
          console.warn('[useWebRTC] ICE restart max attempts reached — closing connection');
          pc.close();
        }
      }
    };

    // Monitor overall connection state
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      console.log('[useWebRTC] Connection state:', state);
    };

    console.log('[useWebRTC] Peer connection created');
    return pc;
  }, []);

  const setLocalStream = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    const pc = pcRef.current;
    if (!pc) {
      console.warn('[useWebRTC] Cannot add local stream — no peer connection');
      return;
    }

    // Add all audio and video tracks from the local stream
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    console.log(
      `[useWebRTC] Local stream added (${stream.getTracks().length} tracks)`,
    );
  }, []);

  const createOffer = useCallback(async (): Promise<string> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error('[useWebRTC] No peer connection — call createPeerConnection first');
    }

    const offer = await pc.createOffer(SDP_OFFER_OPTIONS);
    await pc.setLocalDescription(offer);
    console.log('[useWebRTC] SDP offer created and set as local description');
    return offer.sdp;
  }, []);

  const handleOffer = useCallback(async (sdp: string): Promise<string> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error('[useWebRTC] No peer connection — call createPeerConnection first');
    }

    const offer = new RTCSessionDescription({ type: 'offer', sdp });
    await pc.setRemoteDescription(offer);
    console.log('[useWebRTC] Remote offer set, creating answer');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[useWebRTC] SDP answer created and set as local description');
    return answer.sdp;
  }, []);

  const handleAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error('[useWebRTC] No peer connection — call createPeerConnection first');
    }

    const answer = new RTCSessionDescription({ type: 'answer', sdp });
    await pc.setRemoteDescription(answer);
    console.log('[useWebRTC] Remote answer set');
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) {
      console.warn('[useWebRTC] Cannot add ICE candidate — no peer connection');
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore candidate errors — connection may already be established
      console.warn('[useWebRTC] Failed to add ICE candidate (may be stale)');
    }
  }, []);

  const restartIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.warn('[useWebRTC] Cannot restart ICE — no peer connection');
      return;
    }

    if (iceRestartAttemptsRef.current >= ICE_RESTART_MAX_ATTEMPTS) {
      console.warn('[useWebRTC] ICE restart max attempts reached');
      return;
    }

    console.log(
      `[useWebRTC] Manual ICE restart (${iceRestartAttemptsRef.current + 1}/${ICE_RESTART_MAX_ATTEMPTS})`,
    );

    pc.restartIce();
    iceRestartAttemptsRef.current += 1;
  }, []);

  const close = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      console.log('[useWebRTC] Peer connection closed');
    }
    localStreamRef.current = null;
    iceRestartAttemptsRef.current = 0;
    setRemoteStream(null);
    setConnectionState('closed');
    setIceConnectionState('closed');
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  return {
    remoteStream,
    connectionState,
    iceConnectionState,
    createPeerConnection,
    setLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    restartIce,
    close,
  };
}
