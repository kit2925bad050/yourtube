import { io } from "socket.io-client";
import { getBackendRootUrl } from "./api";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const backend = getBackendRootUrl();
  try {
    socket = backend
      ? io(backend, { transports: ["websocket"], reconnection: true })
      : io({ transports: ["websocket"], reconnection: true });
  } catch (err) {
    console.error("Socket init failed:", err);
  }
  return socket;
}

export default getSocket();
