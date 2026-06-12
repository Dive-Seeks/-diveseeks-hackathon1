"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:7771";

/**
 * useHermesSignal Hook
 * 
 * Responsibilities:
 * 1. Initialize a dedicated WebSocket connection to the /hermes namespace.
 * 2. Monitor tab visibility changes and stream as signals.
 * 3. Listen for global 'hermes:message_sent' DOM events and stream as signals.
 * 4. Perform lightweight rapid-send detection (< 90s) and stream as signals.
 * 5. Listen for 'alert' events from Hermes and display a non-blocking toast.
 * 6. Handle alert acknowledgement and routing to Meeting Room / Separate Talk.
 */
export function useHermesSignal() {
  const socketRef = useRef<Socket | null>(null);
  const lastSendRef = useRef<number>(0);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.tenantId) return;

    const socket = io(`${WS_URL}/hermes`, {
      transports: ["websocket"],
      autoConnect: true,
      auth: {
        tenantId: user.tenantId,
        userId: user.id,
      },
    });
    socketRef.current = socket;

    // Handle Tab Visibility
    const handleVisibilityChange = () => {
      const type = document.hidden ? "tab_hidden" : "tab_visible";
      socket.emit("signal", {
        type,
        timestamp: Date.now(),
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle Message Sent (Global Decoupled Event)
    const handleMessageSent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const message = customEvent.detail?.message;
      const sessionId = customEvent.detail?.sessionId;
      const now = Date.now();

      // Emit the message signal
      socket.emit("signal", {
        type: "message_sent",
        message,
        sessionId,
        timestamp: now,
      });

      // Rapid send detection (< 90s gap)
      if (lastSendRef.current > 0 && now - lastSendRef.current < 90000) {
        socket.emit("signal", {
          type: "rapid_send",
          sessionId,
          timestamp: now,
        });
      }
      lastSendRef.current = now;
    };

    document.addEventListener("hermes:message_sent", handleMessageSent);

    // Listen for Alerts from Hermes via Abigail
    socket.on("alert", (data: { trigger_reason: string; routed_to: string; alert_id: string }) => {
      toast("Abigail wants to check in", {
        description: data.trigger_reason,
        action: {
          label: data.routed_to === "meeting_room" ? "Open Meeting Room" : "Open Separate Talk",
          onClick: () => {
            // Acknowledge the alert
            socket.emit("acknowledge_alert", { alert_id: data.alert_id });
            
            // Route to target while preserving dashboard state
            const route = data.routed_to === "meeting_room" ? "/coding/meeting" : "/coding/talk";
            router.push(route);
          },
        },
        duration: 15000, // Slightly longer duration for important alerts
      });
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("hermes:message_sent", handleMessageSent);
      socket.disconnect();
    };
  }, [router]);

  return null;
}

/**
 * HermesObserver Component
 * 
 * A simple client-side component that activates the useHermesSignal hook.
 * Used in server-side layouts to maintain metadata support.
 */
export function HermesObserver() {
  useHermesSignal();
  return null;
}
