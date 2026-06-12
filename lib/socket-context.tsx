"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { createSocket } from "./socket";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);
    socketRef.current = s;
    forceRender((n) => n + 1);
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
