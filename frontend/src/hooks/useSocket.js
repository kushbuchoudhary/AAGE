import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('leaderboard:update', setLeaderboard);
    return () => socket.disconnect();
  }, [user]);

  const emit = (event, data) => socketRef.current && socketRef.current.emit(event, data);
  const on = (event, fn) => { socketRef.current && socketRef.current.on(event, fn); return () => socketRef.current && socketRef.current.off(event, fn); };
  const off = (event, fn) => socketRef.current && socketRef.current.off(event, fn);

  return (
    React.createElement(SocketContext.Provider, { value: { socket: socketRef.current, emit, on, off, connected, leaderboard } }, children)
  );
}

export const useSocket = () => useContext(SocketContext);
