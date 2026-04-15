'use client';

import { io, Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocketEventType, ClientToServerPayload, ServerToClientPayload } from '@/types/securestream';

export interface UseSignalingReturn {
  socket: Socket | null;
  isConnected: boolean;
  sessionId: string;
  emit: (event: SocketEventType, data: ClientToServerPayload) => void;
  on: (event: SocketEventType, callback: (data: ServerToClientPayload) => void) => void;
  off: (event: SocketEventType, callback: (data: ServerToClientPayload) => void) => void;
}

export function useSignaling(): UseSignalingReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('/socket.io/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[useSignaling] Connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[useSignaling] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[useSignaling] Connection error:', error.message);
    });

    return () => {
      console.log('[useSignaling] Cleaning up socket');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback(
    (event: SocketEventType, data: ClientToServerPayload) => {
      const sock = socketRef.current;
      if (sock?.connected) {
        sock.emit(event, data);
      } else {
        console.warn('[useSignaling] Cannot emit — socket not connected:', event);
      }
    },
    [],
  );

  const on = useCallback(
    (event: SocketEventType, callback: (data: ServerToClientPayload) => void) => {
      socketRef.current?.on(event as string, callback);
    },
    [],
  );

  const off = useCallback(
    (event: SocketEventType, callback: (data: ServerToClientPayload) => void) => {
      socketRef.current?.off(event as string, callback);
    },
    [],
  );

  return { socket, isConnected, sessionId, emit, on, off };
}
