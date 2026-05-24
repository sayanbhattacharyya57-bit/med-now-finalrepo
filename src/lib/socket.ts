import { io, type Socket } from "socket.io-client";
import { getTokens } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const tokens = getTokens();
    socket = io("/", {
      auth: { token: tokens?.accessToken ?? "" },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      path: "/socket.io",
    });

    socket.on("connect", () => {
      console.log("[Socket] connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] connection error:", err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(accessToken?: string) {
  disconnectSocket();
  const tokens = getTokens();
  socket = io("/", {
    auth: { token: accessToken ?? tokens?.accessToken ?? "" },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    path: "/socket.io",
  });
  return socket;
}
