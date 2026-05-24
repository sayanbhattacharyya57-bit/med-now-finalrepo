const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");
const logger = require("./utils/logger");

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      "http://localhost:5000",
      "http://localhost:3000",
    ].filter(Boolean);
    if (!origin || allowed.some((u) => origin.startsWith(u.replace(/\/$/, "")))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev; tighten in prod
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === "/api/v1/health",
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use("/api/", generalLimiter);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.json({
    success: true,
    message: "MedNow API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/hospitals", require("./routes/hospitals"));
app.use("/api/v1/appointments", require("./routes/appointments"));
app.use("/api/v1/ambulance", require("./routes/ambulance"));
app.use("/api/v1/sos", require("./routes/sos"));
app.use("/api/v1/chatbot", require("./routes/chatbot"));
app.use("/api/v1/medicines", require("./routes/medicines"));
app.use("/api/v1/health-records", require("./routes/healthRecords"));
app.use("/api/v1/notifications", require("./routes/notifications"));

// ─── API Docs (inline) ─────────────────────────────────────────────────────────
app.get("/api/v1", (req, res) => {
  res.json({
    success: true,
    message: "MedNow Healthcare Platform API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      hospitals: "/api/v1/hospitals",
      appointments: "/api/v1/appointments",
      ambulance: "/api/v1/ambulance",
      sos: "/api/v1/sos",
      chatbot: "/api/v1/chatbot",
      medicines: "/api/v1/medicines",
      healthRecords: "/api/v1/health-records",
      notifications: "/api/v1/notifications",
    },
    realtime: {
      socket: "Socket.IO (WebSocket + polling)",
      events: {
        chat: ["chat:join", "chat:message", "chat:typing", "chat:history"],
        call: ["call:join", "call:offer", "call:answer", "call:ice-candidate", "call:end", "call:mute"],
        sos: ["sos:alert", "sos:resolved"],
        ambulance: ["ambulance:request", "ambulance:statusUpdate", "ambulance:locationUpdate"],
        notifications: ["notification"],
      },
    },
  });
});

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
