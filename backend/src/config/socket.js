const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const logger = require("../utils/logger");

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) {
        socket.user = null;
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name role avatar");
      socket.user = user;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${socket.id} ${user ? `(${user.name})` : "(anonymous)"}`);

    if (user) {
      // Join personal room for targeted notifications
      socket.join(`user:${user._id}`);

      // Join role-based rooms
      if (user.role === "hospital_admin") {
        socket.join("admins");
      }
      if (user.role === "doctor") {
        socket.join("doctors");
      }
    }

    // ─── Chat ─────────────────────────────────────────────────────────────
    socket.on("chat:join", ({ roomId }) => {
      if (!user) return socket.emit("error", { message: "Authentication required" });
      socket.join(`chat:${roomId}`);
      logger.debug(`${user.name} joined chat room: ${roomId}`);
    });

    socket.on("chat:message", async ({ roomId, content, type = "text", recipientId, appointmentId }) => {
      if (!user) return socket.emit("error", { message: "Authentication required" });
      try {
        const message = await ChatMessage.create({
          room: roomId,
          sender: user._id,
          recipient: recipientId,
          appointment: appointmentId,
          type,
          content,
        });

        const populated = await message.populate("sender", "name avatar role");

        io.to(`chat:${roomId}`).emit("chat:message", {
          id: message._id,
          room: roomId,
          sender: populated.sender,
          content,
          type,
          createdAt: message.createdAt,
        });
      } catch (err) {
        logger.error(`Chat message error: ${err.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:typing", ({ roomId, isTyping }) => {
      if (!user) return;
      socket.to(`chat:${roomId}`).emit("chat:typing", {
        userId: user._id,
        name: user.name,
        isTyping,
      });
    });

    socket.on("chat:history", async ({ roomId, page = 1, limit = 50 }) => {
      if (!user) return socket.emit("error", { message: "Authentication required" });
      try {
        const messages = await ChatMessage.find({ room: roomId })
          .populate("sender", "name avatar role")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);
        socket.emit("chat:history", { messages: messages.reverse(), room: roomId });
      } catch (err) {
        socket.emit("error", { message: "Failed to load history" });
      }
    });

    // ─── WebRTC Signaling ──────────────────────────────────────────────────
    socket.on("call:join", ({ roomId, appointmentId }) => {
      if (!user) return socket.emit("error", { message: "Authentication required" });
      socket.join(`call:${roomId}`);
      socket.to(`call:${roomId}`).emit("call:user-joined", {
        userId: user._id,
        name: user.name,
        role: user.role,
        socketId: socket.id,
      });
      logger.info(`${user.name} joined call room: ${roomId}`);
    });

    socket.on("call:offer", ({ roomId, offer, targetSocketId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit("call:offer", { offer, from: socket.id, user: { id: user?._id, name: user?.name } });
      } else {
        socket.to(`call:${roomId}`).emit("call:offer", { offer, from: socket.id, user: { id: user?._id, name: user?.name } });
      }
    });

    socket.on("call:answer", ({ answer, targetSocketId }) => {
      io.to(targetSocketId).emit("call:answer", { answer, from: socket.id });
    });

    socket.on("call:ice-candidate", ({ candidate, targetSocketId, roomId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit("call:ice-candidate", { candidate, from: socket.id });
      } else if (roomId) {
        socket.to(`call:${roomId}`).emit("call:ice-candidate", { candidate, from: socket.id });
      }
    });

    socket.on("call:end", ({ roomId }) => {
      socket.to(`call:${roomId}`).emit("call:ended", { by: user?._id, name: user?.name });
      socket.leave(`call:${roomId}`);
    });

    socket.on("call:mute", ({ roomId, muted, video }) => {
      socket.to(`call:${roomId}`).emit("call:mute", { userId: user?._id, muted, video });
    });

    // ─── Hospital Admin Room ───────────────────────────────────────────────
    socket.on("hospital:join", ({ hospitalId }) => {
      if (!user || user.role !== "hospital_admin") return;
      socket.join(`hospital:${hospitalId}`);
    });

    // ─── Ambulance Live Tracking ───────────────────────────────────────────
    socket.on("ambulance:track", ({ requestId }) => {
      socket.join(`ambulance:${requestId}`);
    });

    // ─── SOS monitoring ───────────────────────────────────────────────────
    socket.on("sos:monitor", () => {
      if (!user || !["hospital_admin", "doctor"].includes(user.role)) return;
      socket.join("sos:monitor");
    });

    // ─── Presence ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (user) {
        socket.to("doctors").emit("doctor:offline", { userId: user._id });
      }
    });
  });

  logger.info("Socket.IO initialized");
  return io;
};

module.exports = initSocket;
