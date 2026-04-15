'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { LandingPage } from './LandingPage';
import { MatchQueue } from './MatchQueue';
import { LocalVideo } from './LocalVideo';
import { RemoteVideo } from './RemoteVideo';
import type { RemoteVideoHandle } from './RemoteVideo';
import { ChatControls } from './ChatControls';
import { ModerationOverlay } from './ModerationOverlay';
import { ConnectionStatus } from './ConnectionStatus';
import { TrustBadge } from './TrustBadge';
import { TextChat } from './TextChat';
import type { ChatMessage } from './TextChat';
import { useSoundEffects } from './SoundEffects';

// Dynamic imports for conditionally-rendered components (reduces initial bundle size)
const ReportDialog = dynamic(() => import('./ReportDialog').then(mod => ({ default: mod.ReportDialog })), { ssr: false });
const PenaltyOverlay = dynamic(() => import('./PenaltyOverlay').then(mod => ({ default: mod.PenaltyOverlay })), { ssr: false });
const BlacklistOverlay = dynamic(() => import('./BlacklistOverlay').then(mod => ({ default: mod.BlacklistOverlay })), { ssr: false });
const DisconnectedScreen = dynamic(() => import('./DisconnectedScreen').then(mod => ({ default: mod.DisconnectedScreen })), { ssr: false });
const SessionTimer = dynamic(() => import('./SessionTimer').then(mod => ({ default: mod.SessionTimer })), { ssr: false });
const OnlineCount = dynamic(() => import('./OnlineCount').then(mod => ({ default: mod.OnlineCount })), { ssr: false });

import { useSignaling } from '@/hooks/useSignaling';
import { useMediaStream } from '@/hooks/useMediaStream';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useModeration } from '@/hooks/useModeration';
import { useTrustScore } from '@/hooks/useTrustScore';

import type {
  AppPhase,
  DisconnectReason,
  ModerationAnalysis,
  MatchedPayload,
  QueueUpdatePayload,
  SessionEndedPayload,
  QueueRejectedPayload,
  BlacklistedPayload,
  TrustUpdatePayload,
  ModerationKillPayload,
  ModerationWarningPayload,
  ChatMessagePayload,
  OnlineCountPayload,
} from '@/types/securestream';
import { HEARTBEAT_INTERVAL_MS } from '@/lib/constants';

// ─── State ──────────────────────────────────────────────────────────────────

interface VideoChatState {
  phase: AppPhase;
  roomId: string | null;
  partnerId: string | null;
  isInitiator: boolean;
  queuePosition: number;
  estimatedWait: number;
  penaltyCooldown: number;
  blacklistReason: string | null;
  blacklistExpiry: string | null;
  disconnectReason: DisconnectReason | null;
  errorMessage: string | null;
  isBlurred: boolean;
  isWarning: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  trustChange: number;
}

const initialState: VideoChatState = {
  phase: 'landing',
  roomId: null,
  partnerId: null,
  isInitiator: false,
  queuePosition: 1,
  estimatedWait: 10,
  penaltyCooldown: 30,
  blacklistReason: null,
  blacklistExpiry: null,
  disconnectReason: null,
  errorMessage: null,
  isBlurred: false,
  isWarning: false,
  isMuted: false,
  isCameraOff: false,
  trustChange: 0,
};

// ─── Match Found Component ──────────────────────────────────────────────────

function MatchFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-4"
      >
        <m.div
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              '0 0 20px rgba(16,185,129,0.2)',
              '0 0 60px rgba(16,185,129,0.5)',
              '0 0 20px rgba(16,185,129,0.2)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
        >
          <ShieldAlert className="w-10 h-10 text-emerald-500" />
        </m.div>
        <h2 className="text-2xl font-bold text-white">Partner Found!</h2>
        <p className="text-neutral-500 text-sm">Establishing secure connection...</p>
      </m.div>
    </div>
  );
}

// ─── Error Screen Component ────────────────────────────────────────────────

function ErrorScreen({ message, onRetry, onGoHome }: { message: string; onRetry: () => void; onGoHome: () => void }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center">Something went wrong</h2>
        <p className="text-neutral-400 text-sm text-center">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={onRetry}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 h-12 rounded-xl"
          >
            Back to Home
          </Button>
        </div>
      </m.div>
    </div>
  );
}

// ─── Main VideoChat Component ──────────────────────────────────────────────

export function VideoChat() {
  const [state, setState] = useState<VideoChatState>(initialState);

  // ─── Hooks ────────────────────────────────────────────────────────────────

  const { socket, isConnected, sessionId, emit, on, off } = useSignaling();
  const { stream: localStream, requestPermission, stopStream } = useMediaStream();
  const webrtc = useWebRTC();
  const moderation = useModeration();
  const trust = useTrustScore();
  const { playSound, MuteButton } = useSoundEffects();

  // Refs for values needed in socket callbacks (avoid state deps)
  const roomIdRef = useRef<string | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Sync refs with state
  useEffect(() => { roomIdRef.current = state.roomId; }, [state.roomId]);
  useEffect(() => { partnerIdRef.current = state.partnerId; }, [state.partnerId]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // forwardRef to get video element from RemoteVideo
  const remoteVideoHandleRef = useRef<RemoteVideoHandle>(null);

  // ─── New feature state ────────────────────────────────────────────────────

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const totalChatTimeRef = useRef(0);
  const sessionStartForStatsRef = useRef<number | null>(null);

  // ─── Heartbeat interval for signaling ────────────────────────────────────

  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSignalingHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startSignalingHeartbeat = useCallback(() => {
    stopSignalingHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      const rid = roomIdRef.current;
      if (rid) {
        emit('heartbeat', {
          type: 'heartbeat',
          roomId: rid,
          sessionId,
          timestamp: Date.now(),
        });
      }
    }, 10_000);
  }, [emit, sessionId, stopSignalingHeartbeat]);

  // ─── Moderation kill-switch handler ──────────────────────────────────────

  // BUG FIX #1: Use useEffect instead of calling during render
  const onHighRiskRef = useRef<((analysis: ModerationAnalysis) => void) | null>(null);

  useEffect(() => {
    onHighRiskRef.current = (analysis: ModerationAnalysis) => {
      console.warn('[VideoChat] High risk detected — notifying server:', analysis.risk_level);
      const rid = roomIdRef.current;
      const pid = partnerIdRef.current;
      if (rid && pid) {
        emit('moderation_flag', {
          type: 'moderation_flag',
          roomId: rid,
          targetSessionId: pid,
          analysis,
        });
      }
    };
    moderation.setOnHighRisk(onHighRiskRef.current);
  }, [moderation, emit]);

  // ─── Cleanup helper (using refs for stability) ───────────────────────────

  // BUG FIX #7: Cleanup helper uses no state deps — only stable callbacks
  const cleanupCurrentSession = useCallback(() => {
    webrtc.close();
    moderation.stopHeartbeat();
    stopSignalingHeartbeat();

    // Track stats
    if (sessionStartForStatsRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartForStatsRef.current) / 1000);
      totalChatTimeRef.current += elapsed;
      sessionStartForStatsRef.current = null;
    }
  }, [webrtc, moderation, stopSignalingHeartbeat]);

  // ─── Socket event handlers ────────────────────────────────────────────────
  // BUG FIX #5: Use refs for roomId/partnerId so handlers don't depend on state

  useEffect(() => {
    if (!isConnected) return;

    // Queue position update
    const onQueueUpdate = (data: QueueUpdatePayload) => {
      if (data.type === 'queue_update') {
        setState((prev) => ({
          ...prev,
          queuePosition: data.position,
          estimatedWait: data.estimatedWait,
        }));
      }
    };

    // Queue rejected
    const onQueueRejected = (data: QueueRejectedPayload) => {
      if (data.type === 'queue_rejected') {
        if (data.reason === 'penalty_box' && data.cooldownSeconds) {
          setState((prev) => ({
            ...prev,
            phase: 'penalty',
            penaltyCooldown: data.cooldownSeconds!,
          }));
        } else if (data.reason === 'blacklisted') {
          setState((prev) => ({
            ...prev,
            phase: 'blacklisted',
            blacklistReason: 'You have been temporarily suspended',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            phase: 'error',
            errorMessage: `Queue rejected: ${data.reason}`,
          }));
        }
      }
    };

    // Match found
    const onMatched = (data: MatchedPayload) => {
      if (data.type === 'matched') {
        console.log('[VideoChat] Matched with:', data.partnerSessionId?.slice(0, 8), 'initiator:', data.initiator);
        const now = Date.now();
        setSessionStartTime(now);
        sessionStartForStatsRef.current = now;
        setSessionCount((prev) => prev + 1);
        setState((prev) => ({
          ...prev,
          phase: 'matched',
          roomId: data.roomId,
          partnerId: data.partnerSessionId,
          isInitiator: data.initiator,
          isBlurred: false,
          isWarning: false,
        }));
        playSound('match');
      }
    };

    // WebRTC offer from partner
    const onOffer = async (data: any) => {
      if (data.type === 'offer') {
        console.log('[VideoChat] Received offer');
        try {
          setState((prev) => ({ ...prev, phase: 'active' }));
          const ls = localStreamRef.current;
          webrtc.createPeerConnection();
          if (ls) webrtc.setLocalStream(ls);
          const answerSdp = await webrtc.handleOffer(data.sdp);
          emit('answer', { type: 'answer', roomId: data.roomId, sdp: answerSdp });
        } catch (err) {
          console.error('[VideoChat] Error handling offer:', err);
        }
      }
    };

    // WebRTC answer from partner
    const onAnswer = async (data: any) => {
      if (data.type === 'answer') {
        console.log('[VideoChat] Received answer');
        try {
          await webrtc.handleAnswer(data.sdp);
          setState((prev) => ({ ...prev, phase: 'active' }));
        } catch (err) {
          console.error('[VideoChat] Error handling answer:', err);
        }
      }
    };

    // ICE candidate from partner
    const onIceCandidate = (data: any) => {
      if (data.type === 'ice_candidate') {
        webrtc.addIceCandidate(data.candidate);
      }
    };

    // ICE restart request from partner
    const onIceRestart = async (data: any) => {
      if (data.type === 'ice_restart') {
        console.log('[VideoChat] ICE restart requested by partner');
        await webrtc.restartIce();
      }
    };

    // Session ended
    const onSessionEnded = (data: SessionEndedPayload) => {
      if (data.type === 'session_ended') {
        console.log('[VideoChat] Session ended:', data.reason, 'trustChange:', data.trustChange);
        cleanupCurrentSession();
        playSound('disconnect');
        if (data.trustChange) trust.updateScore(trust.score + data.trustChange, data.trustChange);

        if (data.penalty?.cooldownSeconds) {
          setState((prev) => ({
            ...prev,
            phase: 'penalty',
            penaltyCooldown: data.penalty!.cooldownSeconds,
            disconnectReason: data.reason,
            trustChange: data.trustChange ?? 0,
            isBlurred: false,
            isWarning: false,
            roomId: null,
            partnerId: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            phase: 'disconnected',
            disconnectReason: data.reason,
            trustChange: data.trustChange ?? 0,
            isBlurred: false,
            isWarning: false,
            roomId: null,
            partnerId: null,
          }));
        }
        setIsChatOpen(false);
        setChatMessages([]);
        setSessionStartTime(null);
      }
    };

    // Moderation kill
    const onModerationKill = (data: ModerationKillPayload) => {
      if (data.type === 'moderation_kill') {
        console.log('[VideoChat] Moderation kill received:', data.reason);
        cleanupCurrentSession();
        playSound('warning');
        setState((prev) => ({
          ...prev,
          phase: 'disconnected',
          disconnectReason: 'moderation_kill',
          isBlurred: false,
          isWarning: false,
          roomId: null,
          partnerId: null,
        }));
        setIsChatOpen(false);
        setChatMessages([]);
        setSessionStartTime(null);
      }
    };

    // Moderation warning
    const onModerationWarning = (data: ModerationWarningPayload) => {
      if (data.type === 'moderation_warning') {
        console.log('[VideoChat] Moderation warning');
        playSound('warning');
        setState((prev) => ({ ...prev, isWarning: true }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, isWarning: false }));
        }, 5000);
      }
    };

    // Blacklisted
    const onBlacklisted = (data: BlacklistedPayload) => {
      if (data.type === 'blacklisted') {
        cleanupCurrentSession();
        setState((prev) => ({
          ...prev,
          phase: 'blacklisted',
          blacklistReason: data.reason,
          blacklistExpiry: data.expiresAt || null,
          roomId: null,
          partnerId: null,
        }));
      }
    };

    // Trust update
    const onTrustUpdate = (data: TrustUpdatePayload) => {
      if (data.type === 'trust_update') {
        trust.updateScore(data.score, data.change);
      }
    };

    // Chat message from partner
    const onChatMessage = (data: ChatMessagePayload) => {
      if (data.type === 'chat_message') {
        const msg: ChatMessage = {
          id: `msg-${data.time}-${Math.random().toString(36).slice(2, 8)}`,
          from: 'partner',
          text: data.text,
          time: data.time,
        };
        setChatMessages((prev) => [...prev.slice(-199), msg]);
        playSound('message');
      }
    };

    // Online count
    const onOnlineCount = (data: OnlineCountPayload) => {
      if (data.type === 'online_count') {
        setOnlineCount(data.count);
      }
    };

    // Register all handlers
    on('queue_update', onQueueUpdate);
    on('queue_rejected', onQueueRejected);
    on('matched', onMatched);
    on('offer', onOffer);
    on('answer', onAnswer);
    on('ice_candidate', onIceCandidate);
    on('ice_restart', onIceRestart);
    on('session_ended', onSessionEnded);
    on('moderation_kill', onModerationKill);
    on('moderation_warning', onModerationWarning);
    on('blacklisted', onBlacklisted);
    on('trust_update', onTrustUpdate);
    on('chat_message', onChatMessage);
    on('online_count', onOnlineCount);

    return () => {
      off('queue_update', onQueueUpdate);
      off('queue_rejected', onQueueRejected);
      off('matched', onMatched);
      off('offer', onOffer);
      off('answer', onAnswer);
      off('ice_candidate', onIceCandidate);
      off('ice_restart', onIceRestart);
      off('session_ended', onSessionEnded);
      off('moderation_kill', onModerationKill);
      off('moderation_warning', onModerationWarning);
      off('blacklisted', onBlacklisted);
      off('trust_update', onTrustUpdate);
      off('chat_message', onChatMessage);
      off('online_count', onOnlineCount);
    };
  }, [isConnected, on, off, emit, webrtc, trust, cleanupCurrentSession, playSound]);

  // ─── Handle matched: set up WebRTC if initiator ──────────────────────────

  useEffect(() => {
    if (state.phase === 'matched' && state.isInitiator && state.roomId && localStream) {
      const setupInitiator = async () => {
        try {
          webrtc.createPeerConnection();
          webrtc.setLocalStream(localStream);
          const offerSdp = await webrtc.createOffer();
          emit('offer', { type: 'offer', roomId: state.roomId, sdp: offerSdp });
          console.log('[VideoChat] Offer sent');
        } catch (err) {
          console.error('[VideoChat] Error creating offer:', err);
        }
      };

      const timer = setTimeout(setupInitiator, 500);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.isInitiator, state.roomId, localStream, webrtc, emit]);

  // ─── Start moderation heartbeat when active ─────────────────────────────

  useEffect(() => {
    if (state.phase === 'active' && state.roomId) {
      // BUG FIX #3: Get video element from RemoteVideo handle ref, not wrapper div
      const videoEl = remoteVideoHandleRef.current?.getVideoElement();

      if (videoEl) {
        // Create a simple ref-like object for the moderation hook
        const mockRef = { current: videoEl };
        moderation.startHeartbeat(mockRef, sessionId, state.roomId);
      }

      startSignalingHeartbeat();

      // Start moderation result check interval
      const moderationCheck = setInterval(() => {
        if (moderation.lastResult) {
          const riskLevel = moderation.lastResult.risk_level;
          if (riskLevel === 'medium' || riskLevel === 'high') {
            setState((prev) => ({ ...prev, isWarning: true }));
            setTimeout(() => {
              setState((prev) => ({ ...prev, isWarning: false }));
            }, 5000);
          }
          if (riskLevel === 'high' || riskLevel === 'critical') {
            setState((prev) => ({ ...prev, isBlurred: true }));
          } else {
            setState((prev) => ({ ...prev, isBlurred: false }));
          }
        }
      }, HEARTBEAT_INTERVAL_MS);

      return () => {
        moderation.stopHeartbeat();
        stopSignalingHeartbeat();
        clearInterval(moderationCheck);
      };
    }
  }, [state.phase, state.roomId, sessionId, moderation, startSignalingHeartbeat, stopSignalingHeartbeat]);

  // ─── Handle Start ────────────────────────────────────────────────────────
  // BUG FIX #2: Directly handle permission here instead of using PermissionRequest component

  const handleStart = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: 'permission' }));
    try {
      const stream = await requestPermission();
      if (stream) {
        setState((prev) => ({
          ...prev,
          phase: 'queueing',
          queuePosition: 1,
          estimatedWait: 10,
        }));
        emit('join_queue', {
          type: 'join_queue',
          sessionId,
        });
      } else {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: 'Could not access camera/microphone. Please check your permissions.',
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera permission denied';
      setState((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: message,
      }));
    }
  }, [requestPermission, emit, sessionId]);

  // ─── Handle Cancel Queue ─────────────────────────────────────────────────

  const handleCancelQueue = useCallback(() => {
    emit('leave_queue', { sessionId });
    stopStream();
    setState((prev) => ({
      ...prev,
      phase: 'landing',
      roomId: null,
      partnerId: null,
    }));
  }, [emit, sessionId, stopStream]);

  // ─── Handle Skip ─────────────────────────────────────────────────────────

  const handleSkip = useCallback(() => {
    const rid = roomIdRef.current;
    if (rid) {
      emit('skip', {
        type: 'skip',
        roomId: rid,
        sessionId,
        reason: 'user_skip',
        requeue: true,
      });
    }
    cleanupCurrentSession();
    setIsChatOpen(false);
    setChatMessages([]);
  }, [emit, sessionId, cleanupCurrentSession]);

  // ─── Handle Report ───────────────────────────────────────────────────────
  // BUG FIX #6: Send report FIRST, then skip after dialog closes

  const handleReportSubmit = useCallback((reason: string, details: string) => {
    const rid = roomIdRef.current;
    const pid = partnerIdRef.current;
    if (rid && pid) {
      const reportReason = details ? `${reason}: ${details}` : reason;
      emit('report', {
        type: 'report',
        roomId: rid,
        sessionId,
        targetSessionId: pid,
        reason: reportReason,
      });
      console.log('[VideoChat] Report submitted:', reason);
    }
    // After report is sent, end session
    setIsReportOpen(false);
    handleSkip();
  }, [emit, sessionId, handleSkip]);

  const handleOpenReport = useCallback(() => {
    setIsReportOpen(true);
  }, []);

  // ─── Handle End ──────────────────────────────────────────────────────────

  const handleEnd = useCallback(() => {
    const rid = roomIdRef.current;
    if (rid) {
      emit('skip', {
        type: 'skip',
        roomId: rid,
        sessionId,
        reason: 'user_skip',
        requeue: false,
      });
    }
    cleanupCurrentSession();
    stopStream();
    setState((prev) => ({
      ...prev,
      phase: 'landing',
      roomId: null,
      partnerId: null,
      isBlurred: false,
      isWarning: false,
    }));
    setIsChatOpen(false);
    setChatMessages([]);
  }, [emit, sessionId, cleanupCurrentSession, stopStream]);

  // ─── Handle Penalty Complete ─────────────────────────────────────────────

  const handlePenaltyComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'queueing',
      queuePosition: 1,
      estimatedWait: 10,
    }));
    emit('join_queue', {
      type: 'join_queue',
      sessionId,
    });
  }, [emit, sessionId]);

  // ─── Handle Find Next ────────────────────────────────────────────────────

  const handleFindNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'queueing',
      queuePosition: 1,
      estimatedWait: 10,
      disconnectReason: null,
      trustChange: 0,
      isBlurred: false,
      isWarning: false,
    }));
    emit('join_queue', {
      type: 'join_queue',
      sessionId,
    });
  }, [emit, sessionId]);

  // ─── Handle Go Home ──────────────────────────────────────────────────────

  const handleGoHome = useCallback(() => {
    cleanupCurrentSession();
    stopStream();
    setState((prev) => ({
      ...prev,
      phase: 'landing',
      roomId: null,
      partnerId: null,
      disconnectReason: null,
      trustChange: 0,
      isBlurred: false,
      isWarning: false,
    }));
    setIsChatOpen(false);
    setChatMessages([]);
  }, [cleanupCurrentSession, stopStream]);

  // ─── Handle Retry ────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'landing', errorMessage: null }));
  }, []);

  // ─── Handle Toggle Mute ──────────────────────────────────────────────────

  const handleToggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, [localStream]);

  // ─── Handle Toggle Camera ────────────────────────────────────────────────

  const handleToggleCamera = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setState((prev) => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  }, [localStream]);

  // ─── Handle Chat Message Send ────────────────────────────────────────────

  const handleSendChatMessage = useCallback((text: string) => {
    const rid = roomIdRef.current;
    if (!rid) return;

    const now = Date.now();
    const msg: ChatMessage = {
      id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
      from: 'me',
      text,
      time: now,
    };
    setChatMessages((prev) => [...prev.slice(-199), msg]);

    emit('chat_message', {
      type: 'chat_message',
      roomId: rid,
      sessionId,
      text,
      time: now,
    });
  }, [emit, sessionId]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────

  const cleanupRef = useRef(cleanupCurrentSession);
  const stopStreamRef = useRef(stopStream);

  useEffect(() => {
    cleanupRef.current = cleanupCurrentSession;
    stopStreamRef.current = stopStream;
  });

  useEffect(() => {
    return () => {
      cleanupRef.current();
      stopStreamRef.current();
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  const connectionDisplayState = state.phase === 'active'
    ? (webrtc.connectionState === 'connected' ? 'connected' : webrtc.iceConnectionState || 'connecting')
    : 'new';

  // Permission request screen
  const permissionScreen = (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-8 h-8 text-emerald-500" />
          </m.div>
        </div>
        <h2 className="text-xl font-semibold text-white">Requesting Camera Access</h2>
        <p className="text-neutral-500 text-sm text-center max-w-xs">
          SecureStream needs access to your camera and microphone to work.
          Please allow the permission in your browser.
        </p>
      </m.div>
    </div>
  );

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {state.phase === 'landing' && (
          <m.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage onStart={handleStart} trustScore={trust.score} />
          </m.div>
        )}

        {state.phase === 'permission' && (
          <m.div
            key="permission"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {permissionScreen}
          </m.div>
        )}

        {state.phase === 'queueing' && (
          <m.div
            key="queueing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MatchQueue
              position={state.queuePosition}
              estimatedWait={state.estimatedWait}
              onCancel={handleCancelQueue}
            />
          </m.div>
        )}

        {state.phase === 'matched' && (
          <m.div
            key="matched"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MatchFound />
          </m.div>
        )}

        {state.phase === 'active' && (
          <m.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-screen"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 py-2 z-20">
              <div className="flex items-center gap-2">
                <TrustBadge score={trust.score} change={trust.change} />
                {onlineCount > 0 && <OnlineCount count={onlineCount} />}
              </div>
              <div className="flex items-center gap-3">
                <SessionTimer startTime={sessionStartTime} />
                <ConnectionStatus state={connectionDisplayState} />
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex items-start justify-center p-3 md:p-6 relative overflow-hidden">
              {/* Video area */}
              <div className="flex-1 flex items-center justify-center max-w-4xl">
                <RemoteVideo
                  ref={remoteVideoHandleRef}
                  stream={webrtc.remoteStream}
                  isBlurred={state.isBlurred}
                  connectionState={connectionDisplayState}
                />
                {/* Moderation overlay */}
                <ModerationOverlay
                  isBlurred={state.isBlurred}
                  isWarning={state.isWarning}
                />
              </div>

              {/* Chat panel (desktop: side, mobile: overlay) */}
              <div className="hidden md:flex items-start ml-3">
                <TextChat
                  onSendMessage={handleSendChatMessage}
                  messages={chatMessages}
                  isOpen={isChatOpen}
                  onToggle={() => setIsChatOpen((prev) => !prev)}
                />
              </div>

              {/* Local video (picture-in-picture) */}
              <div className="absolute bottom-24 right-3 md:right-6 z-30">
                <LocalVideo
                  stream={localStream}
                  isMuted={state.isMuted}
                  isCameraOff={state.isCameraOff}
                  onToggleMute={handleToggleMute}
                  onToggleCamera={handleToggleCamera}
                />
              </div>
            </div>

            {/* Mobile chat (bottom sheet) */}
            <div className="md:hidden px-3 pb-1">
              <TextChat
                onSendMessage={handleSendChatMessage}
                messages={chatMessages}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen((prev) => !prev)}
              />
            </div>

            {/* Control bar */}
            <ChatControls
              onSkip={handleSkip}
              onReport={handleOpenReport}
              onEnd={handleEnd}
            >
              <MuteButton />
            </ChatControls>

            {/* Report dialog */}
            <ReportDialog
              open={isReportOpen}
              onOpenChange={setIsReportOpen}
              onSubmit={handleReportSubmit}
            />
          </m.div>
        )}

        {state.phase === 'penalty' && (
          <m.div
            key="penalty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PenaltyOverlay
              cooldownSeconds={state.penaltyCooldown}
              onComplete={handlePenaltyComplete}
            />
          </m.div>
        )}

        {state.phase === 'blacklisted' && (
          <m.div
            key="blacklisted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BlacklistOverlay
              reason={state.blacklistReason || 'Policy violation'}
              expiresAt={state.blacklistExpiry || undefined}
            />
          </m.div>
        )}

        {state.phase === 'disconnected' && (
          <m.div
            key="disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DisconnectedScreen
              reason={state.disconnectReason || 'disconnect'}
              trustChange={state.trustChange || undefined}
              newScore={trust.score}
              onFindNext={handleFindNext}
              onGoHome={handleGoHome}
            />
          </m.div>
        )}

        {state.phase === 'error' && (
          <m.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorScreen
              message={state.errorMessage || 'An unknown error occurred'}
              onRetry={handleRetry}
              onGoHome={handleGoHome}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
    </LazyMotion>
  );
}
