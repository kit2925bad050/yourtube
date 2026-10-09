import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(httpServer) {
  // Derive allowed origins from env (FRONTEND_URL or VERCEL_URL) to restrict socket CORS in production
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const socketCors = rawOrigins
    ? { origin: rawOrigins.split(",").map((s) => s.trim()).filter(Boolean), methods: ["GET", "POST"] }
    : { origin: "*", methods: ["GET", "POST"] };

  const io = new Server(httpServer, {
    cors: socketCors,
  });

  ioInstance = io;

  const rooms = new Map();

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userId, userName }) => {
      socket.join(roomId);
      rooms.set(socket.id, { roomId, userId, userName });
      socket.to(roomId).emit("user-joined", { userId, userName, socketId: socket.id });

      const peers = [];
      io.sockets.adapter.rooms.get(roomId)?.forEach((sid) => {
        if (sid !== socket.id) {
          const peer = rooms.get(sid);
          if (peer) peers.push({ socketId: sid, ...peer });
        }
      });
      socket.emit("existing-peers", peers);
    });

    socket.on("offer", ({ roomId, offer, targetSocketId }) => {
      io.to(targetSocketId).emit("offer", { offer, socketId: socket.id });
    });

    socket.on("answer", ({ roomId, answer, targetSocketId }) => {
      io.to(targetSocketId).emit("answer", { answer, socketId: socket.id });
    });

    socket.on("ice-candidate", ({ roomId, candidate, targetSocketId }) => {
      io.to(targetSocketId).emit("ice-candidate", { candidate, socketId: socket.id });
    });

    socket.on("end-call", ({ roomId }) => {
      socket.to(roomId).emit("call-ended", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      const info = rooms.get(socket.id);
      if (info) {
        socket.to(info.roomId).emit("user-left", { socketId: socket.id, userId: info.userId });
        rooms.delete(socket.id);
      }
    });
  });

  return io;
}

export function getIo() {
  return ioInstance;
}
