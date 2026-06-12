import { io, Socket } from "socket.io-client";

// Explicit override always wins.
// In the browser, production runs behind nginx (same origin proxies WS → backend),
// but local dev serves the frontend on 7777 while Socket.IO listens on 7771 —
// so for localhost we must target the backend port directly, not window.location.origin.
function resolveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:7771";
    }
    return origin;
  }
  return "http://localhost:7771";
}

const WS_URL = resolveWsUrl();

// Unauthenticated singleton — used for POS broadcast events (sale_created, inventory_updated, etc.)
// POS events are not tenant-isolated so no auth token is required here.
export const socket: Socket = io(WS_URL, {
  transports: ["websocket", "polling"],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  autoConnect: true,
});

// Authenticated factory — used for AI task events (task_complete, task_progress, task_failed)
// which are scoped to tenant rooms on the server.
export function createSocket(token: string): Socket {
  return io(WS_URL, {
    transports: ["websocket"],
    auth: { token },
  });
}
